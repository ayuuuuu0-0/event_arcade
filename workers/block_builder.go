package workers

import (
	"context"
	"log"
	"sync"

	"eventarcade/blockchain"
	"eventarcade/config"
	"eventarcade/constants"
	"eventarcade/models"
)

// RunBlockBuilder listens on the fan-out channel for match_end events and
// batches every config.BlockBatchSize results into a new block on the chain.
// It is stateless across restarts: the chain is loaded from disk on start
// and written back after each new block.
func RunBlockBuilder(ctx context.Context, events <-chan models.Event, chainPath string) {
	chain, err := blockchain.LoadChain(chainPath)
	if err != nil {
		log.Printf("block builder: load chain: %v", err)
		chain = blockchain.NewChain()
	}

	var mu sync.Mutex
	var pending []blockchain.MatchResult

	for {
		select {
		case <-ctx.Done():
			mu.Lock()
			flushPending(&mu, &pending, chain, chainPath)
			mu.Unlock()
			return
		case evt, ok := <-events:
			if !ok {
				mu.Lock()
				flushPending(&mu, &pending, chain, chainPath)
				mu.Unlock()
				return
			}
			if evt.Type != models.EventTypeMatchEnd {
				continue
			}
			result := extractResult(evt)
			mu.Lock()
			pending = append(pending, result)
			if len(pending) >= config.BlockBatchSize {
				commitBlock(chain, pending, chainPath)
				pending = pending[:0]
			}
			mu.Unlock()
		}
	}
}

func extractResult(evt models.Event) blockchain.MatchResult {
	winner, _ := evt.Payload[constants.PayloadKeyWinner].(string)
	loser, _ := evt.Payload[constants.PayloadKeyLoser].(string)
	return blockchain.MatchResult{
		MatchID:  evt.MatchID,
		WinnerID: winner,
		LoserID:  loser,
	}
}

func commitBlock(chain *blockchain.Chain, results []blockchain.MatchResult, chainPath string) {
	batch := make([]blockchain.MatchResult, len(results))
	copy(batch, results)
	chain.AppendBlock(batch)
	if err := chain.WriteTo(chainPath); err != nil {
		log.Printf("block builder: write chain: %v", err)
	}
}

func flushPending(mu *sync.Mutex, pending *[]blockchain.MatchResult, chain *blockchain.Chain, chainPath string) {
	if len(*pending) > 0 {
		commitBlock(chain, *pending, chainPath)
		*pending = (*pending)[:0]
	}
}
