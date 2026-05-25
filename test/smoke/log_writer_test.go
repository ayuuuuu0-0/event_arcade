package smoke_test

import (
	"bufio"
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"eventarcade/models"
	"eventarcade/service"
	testdata "eventarcade/test"
)

func TestLogWriterWritesSmokeEvents(t *testing.T) {
	t.Parallel()

	logPath := filepath.Join(t.TempDir(), "events.log")
	ctx, cancel := context.WithCancel(context.Background())

	writer := service.NewLogWriter(logPath)
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		_ = writer.Run(ctx)
	}()

	inbound := writer.Inbound()
	base := time.Now().UTC()
	for i := range testdata.EventCountSmoke {
		inbound <- testdata.NewSmokeHitEvent(i, base)
	}

	cancel()
	wg.Wait()

	lines := readLogLines(t, logPath)
	if len(lines) != testdata.EventCountSmoke {
		t.Fatalf("expected %d log lines, got %d", testdata.EventCountSmoke, len(lines))
	}

	for i, line := range lines {
		var evt models.Event
		if err := json.Unmarshal([]byte(line), &evt); err != nil {
			t.Fatalf("line %d: invalid json: %v", i+1, err)
		}
		if len(evt.ID) == 0 {
			t.Fatalf("line %d: missing event id", i+1)
		}
		if evt.MatchID != testdata.MatchIDSmoke {
			t.Fatalf("line %d: match_id = %q, want %q", i+1, evt.MatchID, testdata.MatchIDSmoke)
		}
	}
}

func readLogLines(t *testing.T, path string) []string {
	t.Helper()

	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("open log: %v", err)
	}
	defer f.Close()

	var lines []string
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		if len(scanner.Text()) > 0 {
			lines = append(lines, scanner.Text())
		}
	}
	if err := scanner.Err(); err != nil {
		t.Fatalf("read log: %v", err)
	}
	return lines
}
