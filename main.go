package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"time"

	"eventarcade/config"
	"eventarcade/constants"
	"eventarcade/controllers"
	"eventarcade/repo"
	"eventarcade/service"
	"eventarcade/workers"
)

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()

	writer := service.NewLogWriter(config.EventLogPath)
	logInbound := writer.Inbound()

	leaderboard := repo.NewLeaderboardRepo()
	defer leaderboard.Close()

	pingCtx, pingCancel := context.WithTimeout(ctx, 2*time.Second)
	redisAvailable := leaderboard.Ping(pingCtx) == nil
	pingCancel()

	blockBuilderCh := writer.Subscribe()

	var workerWG sync.WaitGroup

	if redisAvailable {
		eventConsumerCh := writer.Subscribe()
		workerWG.Add(1)
		go func() {
			defer workerWG.Done()
			workers.RunEventConsumer(ctx, eventConsumerCh, leaderboard)
		}()
	} else {
		log.Printf("redis not available, event consumer disabled")
	}

	workerWG.Add(1)
	go func() {
		defer workerWG.Done()
		workers.RunBlockBuilder(ctx, blockBuilderCh, config.ChainFilePath)
	}()

	var logWG sync.WaitGroup
	logWG.Add(1)
	go func() {
		defer logWG.Done()
		if err := writer.Run(ctx); err != nil && err != context.Canceled {
			log.Printf("log writer: %v", err)
		}
	}()

	registry := service.NewMatchRegistry()

	var matchWG sync.WaitGroup
	for range config.ParallelMatchCount {
		matchWG.Add(1)
		go func() {
			defer matchWG.Done()
			match, err := service.NewMatch(constants.ModeBot, "")
			if err != nil {
				log.Printf("create match: %v", err)
				return
			}
			registry.Register(match)
			if err := service.RunMatch(ctx, match, logInbound); err != nil && err != context.Canceled {
				log.Printf("match %s: %v", match.ID, err)
			}
			registry.Remove(match.ID)
		}()
	}

	dashboardCh := writer.Subscribe()
	dashCtrl := controllers.NewDashboardController(registry)
	workerWG.Add(1)
	go func() {
		defer workerWG.Done()
		dashCtrl.RunBroadcaster(ctx, dashboardCh)
	}()

	mux := http.NewServeMux()

	matchCtrl := controllers.NewMatchController(registry, leaderboard, logInbound)
	matchCtrl.Register(mux)

	wsCtrl := controllers.NewWSController(registry)
	wsCtrl.Register(mux)

	dashCtrl.Register(mux)

	mux.Handle("GET /static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	listenAddr := config.ServerPort()
	server := &http.Server{
		Addr:    listenAddr,
		Handler: controllers.CORSMiddleware(mux),
	}

	go func() {
		log.Printf("http server listening on %s", listenAddr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("http server: %v", err)
		}
	}()

	<-ctx.Done()
	log.Printf("shutting down...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("http shutdown: %v", err)
	}

	matchWG.Wait()
	cancel()
	workerWG.Wait()
	logWG.Wait()
}
