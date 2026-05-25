package integration_test

import (
	"context"
	"testing"
	"time"

	"eventarcade/constants"
	"eventarcade/models"
	"eventarcade/service"
)

func TestRunMatchEndsWithMatchEndEvent(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	match, err := service.NewMatch(constants.ModeBot, "")
	if err != nil {
		t.Fatalf("new match: %v", err)
	}

	events := make(chan models.Event, 256)
	errCh := make(chan error, 1)
	go func() {
		errCh <- service.RunMatch(ctx, match, events)
		close(events)
	}()

	var gotEnd bool
	for evt := range events {
		if evt.Type == models.EventTypeMatchEnd && evt.MatchID == match.ID {
			gotEnd = true
		}
	}

	if err := <-errCh; err != nil {
		t.Fatalf("run match: %v", err)
	}
	if !gotEnd {
		t.Fatal("expected match_end event")
	}
}
