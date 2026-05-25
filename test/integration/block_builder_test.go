package integration_test

import (
	"context"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"eventarcade/blockchain"
	"eventarcade/config"
	"eventarcade/constants"
	"eventarcade/models"
	"eventarcade/service"
	"eventarcade/workers"
)

func TestBlockBuilderCreatesBlocks(t *testing.T) {
	t.Parallel()

	logPath := filepath.Join(t.TempDir(), "events.log")
	chainPath := filepath.Join(t.TempDir(), "chain.json")

	ctx, cancel := context.WithCancel(context.Background())
	writer := service.NewLogWriter(logPath)
	builderCh := writer.Subscribe()

	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		_ = writer.Run(ctx)
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		workers.RunBlockBuilder(ctx, builderCh, chainPath)
	}()

	inbound := writer.Inbound()
	now := time.Now().UTC()
	matchCount := config.BlockBatchSize + 1
	for i := range matchCount {
		inbound <- models.Event{
			ID:        "evt_end_" + time.Now().Format("150405.000"),
			Type:      models.EventTypeMatchEnd,
			Timestamp: now.Add(time.Duration(i) * time.Millisecond),
			MatchID:   "match_block_test_" + string(rune('a'+i)),
			Payload: map[string]any{
				constants.PayloadKeyWinner: "bot_w",
				constants.PayloadKeyLoser:  "bot_l",
			},
		}
		time.Sleep(5 * time.Millisecond)
	}

	time.Sleep(50 * time.Millisecond)
	cancel()
	wg.Wait()

	chain, err := blockchain.LoadChain(chainPath)
	if err != nil {
		t.Fatalf("load chain: %v", err)
	}

	// genesis + at least 1 committed block (batch of 3) + possibly a flush block
	if len(chain.Blocks) < 2 {
		t.Fatalf("expected at least 2 blocks (genesis + 1), got %d", len(chain.Blocks))
	}
	if !chain.Verify() {
		t.Fatal("chain verification failed")
	}
}
