package integration_test

import (
	"context"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"eventarcade/models"
	"eventarcade/service"
	testdata "eventarcade/test"
)

func TestLogWriterFanOutToSubscriber(t *testing.T) {
	t.Parallel()

	logPath := filepath.Join(t.TempDir(), "events.log")
	ctx, cancel := context.WithCancel(context.Background())

	writer := service.NewLogWriter(logPath)
	sub := writer.Subscribe()

	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		_ = writer.Run(ctx)
	}()

	want := testdata.NewSmokeHitEvent(0, time.Now().UTC())
	writer.Inbound() <- want

	received := <-sub
	if received.ID != want.ID {
		t.Fatalf("subscriber event id = %q, want %q", received.ID, want.ID)
	}
	if received.Type != models.EventTypeHit {
		t.Fatalf("subscriber event type = %q, want %q", received.Type, models.EventTypeHit)
	}

	cancel()
	wg.Wait()
}
