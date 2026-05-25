package smoke_test

import (
	"path/filepath"
	"testing"

	"eventarcade/blockchain"
)

func TestBlockchainChainAndVerify(t *testing.T) {
	t.Parallel()

	chain := blockchain.NewChain()
	if len(chain.Blocks) != 1 {
		t.Fatalf("expected genesis block, got %d blocks", len(chain.Blocks))
	}

	chain.AppendBlock([]blockchain.MatchResult{
		{MatchID: "match_001", WinnerID: "bot_a", LoserID: "bot_b"},
	})
	chain.AppendBlock([]blockchain.MatchResult{
		{MatchID: "match_002", WinnerID: "bot_c", LoserID: "bot_d"},
		{MatchID: "match_003", WinnerID: "bot_e", LoserID: "bot_f"},
	})

	if len(chain.Blocks) != 3 {
		t.Fatalf("expected 3 blocks, got %d", len(chain.Blocks))
	}
	if !chain.Verify() {
		t.Fatal("chain verification failed")
	}

	chainPath := filepath.Join(t.TempDir(), "chain.json")
	if err := chain.WriteTo(chainPath); err != nil {
		t.Fatalf("write chain: %v", err)
	}

	loaded, err := blockchain.LoadChain(chainPath)
	if err != nil {
		t.Fatalf("load chain: %v", err)
	}
	if len(loaded.Blocks) != 3 {
		t.Fatalf("loaded chain expected 3 blocks, got %d", len(loaded.Blocks))
	}
	if !loaded.Verify() {
		t.Fatal("loaded chain verification failed")
	}

	for i := 1; i < len(loaded.Blocks); i++ {
		if loaded.Blocks[i].PreviousHash != loaded.Blocks[i-1].Hash {
			t.Fatalf("block %d previous_hash mismatch", i)
		}
	}
}
