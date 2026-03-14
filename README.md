# EventArcade Arena — Project Architecture & Build Brief

> This document is the single source of truth for the EventArcade Arena project.
> Use it to track progress, understand decisions, and guide implementation.

---

## What Is EventArcade Arena?

An event-driven arcade battle simulation written in Go. Bots (and later real players) compete in fast matches. Every action is logged as an immutable event. Rankings and derived state live in Redis, rebuilt from the log at any time. Match results are batched into a lightweight blockchain for tamper detection. A retro terminal + pixel dashboard visualizes everything in real time.

---

## Core Architectural Principles

1. **Event log is the source of truth.** Everything else is derived state.
2. **Single writer, multiple readers.** One goroutine owns all file writes. No locks needed.
3. **Deterministic seeded randomness.** Every match outcome is reproducible and auditable.
4. **Idempotent workers.** Replaying events never corrupts state — each event has a unique ID.
5. **Blockchain as integrity layer, not consensus.** SHA-256 chaining detects tampering, nothing more.

---

## System Data Flow

```
[Match Engine A] ──┐
[Match Engine B] ──┼──► [Log Writer Goroutine] ──► events.log (append-only, JSONL)
[Match Engine C] ──┘              │
                                  └──► [Fan-out channels]
                                              │
                              ┌───────────────┴───────────────┐
                              ▼                               ▼
                   [Event Worker]                    [Block Builder]
                   (updates Redis)                  (batches results,
                              │                      chains SHA-256 hashes)
                              ▼
                   [Redis: rankings,
                    leaderboards,
                    match state]
                              │
                              ▼
                   [HTTP API / WebSocket]
                              │
                              ▼
                   [Terminal + Pixel Dashboard]
```

---

## Confirmed Technical Decisions

### Event Log

- **Format:** Append-only flat file, one JSON object per line (JSONL)
- **Writer:** Single dedicated goroutine. Match engines send events via a channel — never write directly.
- **Readers:** Workers receive events via fan-out channels mirrored from the writer, not by tailing the file.
- **Why file-based:** Simple, portable, auditable. Can replay the entire system by re-reading the file.

### Match Engine

- **Match duration:** ~10 seconds
- **Tick rate:** 100ms per tick = 100 ticks per match
- **Event density:** Not every tick produces an event (~30% probability), targeting 20–40 events per match
- **Bots per match:** 2 (expandable later)
- **Concurrency:** Multiple matches run in parallel, each in its own goroutine

### Event Types


| Event           | Trigger                                          |
| --------------- | ------------------------------------------------ |
| `hit`           | RNG roll, depletes target HP                     |
| `dodge`         | RNG roll, grants 1-tick immunity                 |
| `critical_hit`  | RNG roll, applies damage multiplier              |
| `powerup_spawn` | RNG roll, max 2 per match                        |
| `match_end`     | Fired when any bot's HP reaches 0 — never by RNG |


### Event Probability Weights (per tick)


| Outcome       | Probability                  |
| ------------- | ---------------------------- |
| nothing       | ~65%                         |
| hit           | ~18%                         |
| dodge         | ~8%                          |
| critical_hit  | ~5%                          |
| powerup_spawn | ~4%                          |
| match_end     | consequence only, not rolled |


### Damage Model

- **Base damage:** Variable range (e.g. 5–15 per hit), not fixed — keeps outcomes unpredictable
- **Critical hit:** Multiplier applied to base damage (e.g. 2x), not a flat bonus
- **Starting HP:** 100 per bot
- **Tweakability:** All values centralized in `config/config.go` for easy tuning

### Bot State (ephemeral, per match)

```
hp            int     // starts at 100
is_dodging    bool    // true = immune this tick
powerup_held  bool    // blocks further powerup spawns if true
```

State is never stored — it's derived by replaying events from the log. This is what makes seeded RNG auditable.

### Deterministic Seeded Randomness

- Each match receives a seed: `hash(match_id + timestamp)`
- `math/rand` is initialized with this seed at match start
- Given the same seed, the same sequence of events always replays identically
- This is the audit trail — any match result can be independently verified

### Redis Schema


| Key                  | Type       | Purpose                       |
| -------------------- | ---------- | ----------------------------- |
| `leaderboard:global` | Sorted Set | Global bot rankings by score  |
| `match:{id}:events`  | List       | Per-match event references    |
| `bot:{name}:stats`   | Hash       | Win count, total damage, etc. |


### Blockchain Integrity Layer

- After every N matches (or every T seconds), a block is committed
- Block contents: array of match result summaries + previous block hash
- Hash algorithm: SHA-256
- Storage: JSON file or in-memory chain (file preferred for auditability)
- Purpose: Retroactive tampering with the event log becomes detectable
- This is **not** a consensus system — it is a checksum chain

---

## Project File Structure

```
eventarcade/
├── main.go                  // Wire everything, launch matches, block until done
├── config/
│   └── config.go            // All tunable constants (tick rate, HP, damage, weights)
├── service/
│   ├── log.go               // Log writer goroutine + fan-out channel logic (uses models.Event)
│   └── match.go             // Match loop, bot state, RNG, event emission
├── workers/
│   └── consumer.go          // Reads fan-out channel, writes derived state to Redis
└── blockchain/
    └── block.go             // Block struct, SHA-256 chaining, block store
```

---

## Common Event Struct (all events share these fields)

```go
type Event struct {
    ID        string         // unique per event, used for deduplication
    Type      EventType      // hit, dodge, critical_hit, powerup_spawn, match_end
    Timestamp time.Time
    MatchID   string
    Payload   map[string]any // flexible: damage, bot names, HP remaining, etc.
}
```

---

## Build Order

Work through these in sequence. Each step produces something runnable before the next begins.

### Phase 1 — Backend Foundation

- **Step 1:** `models/event.go` — Define `Event` struct and `EventType` constants (single source of truth for event schema)
- **Step 2:** `config/config.go` — All constants: tick rate, HP, damage range, crit multiplier, weights
- **Step 3:** `events/log.go` — Log writer goroutine + channel + fan-out to subscriber channels
- **Step 4:** `engine/match.go` — Match loop: ticks, RNG rolls, bot state, event emission, match_end detection
- **Step 5:** `main.go` — Launch multiple concurrent matches, verify `events.log` fills correctly
- **Step 6:** `workers/consumer.go` — Consume fan-out channel, update Redis leaderboard
- **Step 7:** `blockchain/block.go` — Batch match results into SHA-256 chained blocks

### Phase 2 — API Layer

- HTTP endpoints to expose leaderboard, match history, block chain state
- WebSocket stream for live event feed

### Phase 3 — Frontend Dashboard

- Retro terminal UI (leaderboards, live event stream, system metrics)
- Pixel-style visualization layer

---

## Definition of "Phase 1 Complete"

Running `go run main.go` should:

1. Start multiple matches concurrently
2. Produce an `events.log` file with valid JSONL — one event per line
3. Show coherent HP progressions per match (hits reduce HP, match ends when HP hits 0)
4. Update `leaderboard:global` in Redis after each match ends
5. Commit at least one block to the blockchain store

---

## Key Design Rules (do not break these)

- **Never write to the log file outside the log writer goroutine**
- `**match_end` is always a consequence of HP reaching 0, never a random roll**
- **Workers must be idempotent** — duplicate event delivery must not corrupt state
- **Bot ephemeral state is never persisted** — always derived from event replay
- **All tunable values live in `config/config.go`** — never hardcode game constants elsewhere

---

## Code Structure & Database

This section describes the layered structure used for scaling and maintainability. It will be updated as implementation progresses.

### Layered Architecture (high level)


| Layer                  | Responsibility                                                                                      | Fits in EventArcade as                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Models**             | Data shapes / schemas (DB documents, API DTOs)                                                      | Event struct, match result, block, bot stats, etc.                          |
| **Repo**               | All DB read/write; single place that talks to MongoDB                                               | Event log persistence, leaderboard reads/writes, block store (if DB-backed) |
| **Service**            | Business logic; orchestrates repo + rules                                                           | Event log writer + fan-out, match loop, leaderboard aggregation, block building |
| **Controllers**        | HTTP/API layer; parse request, call service, return response                                        | (Phase 2) REST handlers, WebSocket handlers                                 |
| **Workers / Handlers** | Process async jobs or streams; one handler per concern, each with a `Process` (or similar) function | Event consumer (Redis/DB updates), block builder worker                     |


### Database Choice: MongoDB vs Postgres

- **MongoDB** fits well here because:
    - Event documents are naturally JSON-like; your `Event` struct maps cleanly to BSON.
    - Schema can evolve (e.g. new event types or payload fields) without migrations.
    - Good for append-only event log style writes and flexible queries (by `match_id`, `event_type`, time range).
    - You can store derived state (leaderboards, bot stats) in the same DB or keep Redis for hot path and use Mongo for persistence/audit.
- **Postgres** is a strong alternative if:
    - You want strict relational integrity (e.g. matches → events → bots with FKs).
    - You need complex analytical queries, JOINs, or ACID transactions across multiple tables.
    - You prefer SQL and migrations for schema changes.

**Recommendation for EventArcade:** MongoDB is a good fit for an event-sourced, flexible-payload design and aligns with your “event log as source of truth” principle. Use it for: event log storage (optional mirror or primary), derived state (if you move off or complement Redis), and any future document-shaped data. Postgres is better if you later add strong relational constraints or heavy reporting.

### Directory Layout (target, with DB and layers)

```
eventarcade/
├── main.go
├── config/
│   └── config.go
├── models/                    # Schemas / DTOs (events, matches, blocks, bot stats)
│   ├── event.go
│   ├── match.go
│   └── ...
├── repo/                      # MongoDB (and optionally file/Redis) access only
│   ├── event_repo.go
│   ├── leaderboard_repo.go
│   └── ...
├── service/                   # Business logic: event log writer + fan-out, match engine, leaderboard, blocks
│   ├── log.go                 # Log writer goroutine + fan-out (uses models.Event)
│   ├── match.go               # Match engine: loop, ticks, RNG, bot state, event emission
│   └── ...
├── workers/                   # Handlers with Process(ctx, event) style functions
│   ├── event_consumer.go     # process event → update Redis/DB
│   └── block_builder.go      # process match_end / batch → append block
├── controllers/              # (Phase 2) HTTP + WebSocket
│   └── ...
└── blockchain/
    └── block.go
```

- **Handlers (workers):** Each worker subscribes to the event stream (or a queue). One `Process(ctx, event)` (or `ProcessEvent`) per worker; inside it you call service or repo—never put business logic in the handler beyond “parse, delegate, ack”.
- **Controllers:** In Phase 2, each HTTP/WS endpoint is a thin controller: parse input → call one or more services → return response.
- **Service:** Event log writer + fan-out, match rules, damage, RNG, “when to emit match_end”, and “how to build a block” live here; they use repo for persistence and read models.
- **Repo:** Only layer that knows about MongoDB (drivers, collections, queries). Returns/accepts models. Keeps the rest of the app DB-agnostic so you can swap or add stores later.
- **Models:** Single place for `Event`, `MatchResult`, `Block`, etc. Use the same structs (or thin DTOs) across repo, service, and workers so the codebase stays consistent.

Core functionality (event log format, single writer, fan-out, deterministic RNG, blockchain as integrity layer) remains as in the rest of this document; this structure only organizes where code lives.

---

## Open Questions (for future phases)

- Real player support: how do player inputs get injected into the tick loop?
- Powerup mechanics: what do powerups actually do when used?
- Match matchmaking: how are bots/players paired?
- Replay system: UI for stepping through a past match event by event
- Horizontal scaling: multiple log writer instances with partitioned match IDs

