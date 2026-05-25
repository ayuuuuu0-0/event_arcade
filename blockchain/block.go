package blockchain

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"time"
)

type MatchResult struct {
	MatchID  string `json:"match_id"`
	WinnerID string `json:"winner_id"`
	LoserID  string `json:"loser_id"`
}

type Block struct {
	Index        int           `json:"index"`
	Timestamp    time.Time     `json:"timestamp"`
	Results      []MatchResult `json:"results"`
	PreviousHash string        `json:"previous_hash"`
	Hash         string        `json:"hash"`
}

func NewBlock(index int, results []MatchResult, previousHash string) Block {
	b := Block{
		Index:        index,
		Timestamp:    time.Now().UTC(),
		Results:      results,
		PreviousHash: previousHash,
	}
	b.Hash = b.computeHash()
	return b
}

func (b *Block) computeHash() string {
	data, _ := json.Marshal(struct {
		Index        int           `json:"index"`
		Timestamp    time.Time     `json:"timestamp"`
		Results      []MatchResult `json:"results"`
		PreviousHash string        `json:"previous_hash"`
	}{
		Index:        b.Index,
		Timestamp:    b.Timestamp,
		Results:      b.Results,
		PreviousHash: b.PreviousHash,
	})
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}

type Chain struct {
	Blocks []Block `json:"blocks"`
}

func NewChain() *Chain {
	genesis := NewBlock(0, nil, "")
	return &Chain{Blocks: []Block{genesis}}
}

func (c *Chain) LastHash() string {
	if len(c.Blocks) == 0 {
		return ""
	}
	return c.Blocks[len(c.Blocks)-1].Hash
}

func (c *Chain) AppendBlock(results []MatchResult) Block {
	b := NewBlock(len(c.Blocks), results, c.LastHash())
	c.Blocks = append(c.Blocks, b)
	return b
}

func (c *Chain) WriteTo(path string) error {
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal chain: %w", err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return fmt.Errorf("write chain file: %w", err)
	}
	return nil
}

func LoadChain(path string) (*Chain, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return NewChain(), nil
		}
		return nil, fmt.Errorf("read chain file: %w", err)
	}
	if len(data) == 0 {
		return NewChain(), nil
	}
	var chain Chain
	if err := json.Unmarshal(data, &chain); err != nil {
		return nil, fmt.Errorf("unmarshal chain: %w", err)
	}
	return &chain, nil
}

func (c *Chain) Verify() bool {
	for i := 1; i < len(c.Blocks); i++ {
		if c.Blocks[i].PreviousHash != c.Blocks[i-1].Hash {
			return false
		}
		recomputed := c.Blocks[i].computeHash()
		if c.Blocks[i].Hash != recomputed {
			return false
		}
	}
	return true
}
