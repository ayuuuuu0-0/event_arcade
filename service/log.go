package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sync"
	"sync/atomic"

	"eventarcade/config"
	"eventarcade/models"
)

type LogWriter struct {
	path        string
	inbound     chan models.Event
	subscribers []chan models.Event
	mu          sync.Mutex
	dropped     atomic.Uint64
}

func NewLogWriter(path string) *LogWriter {
	return &LogWriter{
		path:    path,
		inbound: make(chan models.Event, config.InboundChannelBuffer),
	}
}

func (lw *LogWriter) Inbound() chan<- models.Event {
	return lw.inbound
}

func (lw *LogWriter) Subscribe() <-chan models.Event {
	ch := make(chan models.Event, config.SubscriberChannelBuffer)
	lw.mu.Lock()
	lw.subscribers = append(lw.subscribers, ch)
	lw.mu.Unlock()
	return ch
}

func (lw *LogWriter) DroppedCount() uint64 {
	return lw.dropped.Load()
}

func (lw *LogWriter) Run(ctx context.Context) error {
	if len(lw.path) == 0 {
		return fmt.Errorf("event log path is empty")
	}

	file, err := os.OpenFile(lw.path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return fmt.Errorf("open event log: %w", err)
	}
	defer file.Close()

	for {
		select {
		case <-ctx.Done():
			if err := lw.drainInbound(file); err != nil {
				return err
			}
			return ctx.Err()
		case event, ok := <-lw.inbound:
			if !ok {
				return nil
			}
			if err := lw.persist(file, event); err != nil {
				return err
			}
		}
	}
}

func (lw *LogWriter) drainInbound(file *os.File) error {
	for {
		select {
		case event, ok := <-lw.inbound:
			if !ok {
				return nil
			}
			if err := lw.persist(file, event); err != nil {
				return err
			}
		default:
			return nil
		}
	}
}

func (lw *LogWriter) persist(file *os.File, event models.Event) error {
	line, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal event: %w", err)
	}
	line = append(line, '\n')
	if _, err := file.Write(line); err != nil {
		return fmt.Errorf("write event log: %w", err)
	}
	lw.fanOut(event)
	return nil
}

func (lw *LogWriter) fanOut(event models.Event) {
	lw.mu.Lock()
	subs := append([]chan models.Event(nil), lw.subscribers...)
	lw.mu.Unlock()

	for _, sub := range subs {
		select {
		case sub <- event:
		default:
			n := lw.dropped.Add(1)
			log.Printf("log writer: dropped event (total=%d) id=%s type=%s match_id=%s",
				n, event.ID, event.Type, event.MatchID)
		}
	}
}
