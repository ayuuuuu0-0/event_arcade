# EventArcade — Project Architecture & Build Brief

> This document is the single source of truth for the EventArcade project.
> Use it to track progress, understand decisions, and guide implementation.

---

## What Is EventArcade?

An event-driven arcade battle simulation written in Go. Bots (and later real players)
compete in fast matches. Every action is logged as an immutable event. Rankings and
derived state live in Redis, rebuilt from the log at any time. Match results are batched
into a lightweight blockchain for tamper detection. A retro terminal + pixel dashboard
visualizes everything in real time.

---

## Core Architectural Principles

1. **Event log is the source of truth.** Everything else is derived state.
2. **Single writer, multiple readers.** One goroutine owns all file writes. No locks needed.
3. **Deterministic seeded randomness.** Every match outcome is reproducible and auditable.
4. **Idempotent workers.** Replaying events never corrupts state — each event has a unique ID.
5. **Blockchain as integrity layer, not consensus.** SHA-256 chaining detects tampering, nothing more.
6. **Bots and humans are both Players.** `IsBot` is metadata, not a type. The engine never branches on it.

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

## Bot vs Player — How the Distinction Works

This is one of the most important design decisions in the system.
Read this section carefully before touching any match-related code.

### The Design Philosophy

Bots and human players are treated as the same entity in this system — a `Player`.
The `IsBot` flag is metadata, not a type distinction. This matches how production game
backends (matchmaking systems, chess platforms, arcade servers) model participants:
the engine does not care who is making a decision, only that a decision arrives each tick.

The `IsBot` flag drives exactly one decision in the entire codebase: how `GetAction()`
resolves. Outside of that single method, nothing ever reads `IsBot`. If you find yourself
writing `if player.IsBot` anywhere other than action resolution, logic is leaking.

---

### The Player Struct

One struct represents every participant in every match — human or bot.

```go
// models/player.go

type Player struct {
    ID      string       // "bot_fury" or "player_abc123" — same field, different values
    IsBot   bool         // true = resolve action via RNG, false = wait on inputCh
    inputCh chan Action   // nil for bots; initialized for humans by the factory
}
```

The `inputCh` field is the bridge between the WebSocket layer and the match engine.
For bots it is nil and never touched. For humans it is a buffered channel that the
WebSocket handler writes into when the player presses a key.

Action resolution lives in one method on this struct:

```go
func (p *Player) GetAction(state MatchState) Action {
    if p.IsBot {
        return rollWeightedAction(state.RNG)   // RNG decides instantly
    }
    select {
    case action := <-p.inputCh:               // human pressed a key in time
        return action
    case <-time.After(150 * time.Millisecond): // too slow — use fallback
        return ActionIdle
    }
}
```

This is the only `if p.IsBot` check in the entire codebase.

---

### The Complete Journey: From Button Click to Match Running

Every step from the moment a user clicks a button to the moment the match engine
is ticking. This is where the flag is read — and where it permanently disappears.

```
────────────────────────────────────────────────────────────────
STEP 1 — The User Clicks a Button in the Frontend
────────────────────────────────────────────────────────────────

The UI has two options: "Bot Match" and "Player Match".
When clicked, the frontend sends a single HTTP POST to the backend.

  Bot match:
    POST /match/create
    { "mode": "bot" }

  Player match:
    POST /match/create
    { "mode": "player", "player_id": "abc123" }

This is the only moment the word "bot" or "player" appears as a routing key.
It lives in this HTTP request and nowhere else in the system.


────────────────────────────────────────────────────────────────
STEP 2 — The Controller Receives the Request (Phase 2)
────────────────────────────────────────────────────────────────

The HTTP controller in controllers/match_controller.go receives the POST.
It reads the "mode" field from the request body exactly once.
It immediately hands it to the Match Factory service.
The controller never reads or stores the mode flag again after this call.

  // controllers/match_controller.go
  mode     := req.Body["mode"]         // read once here
  playerID := req.Body["player_id"]    // empty string if bot
  match    := matchFactory.Create(mode, playerID)
  // mode is now gone — controller never references it again


────────────────────────────────────────────────────────────────
STEP 3 — The Match Factory (THE ONLY PLACE THAT BRANCHES ON MODE)
────────────────────────────────────────────────────────────────

This is the single decision point in the entire codebase.
One if-statement. One place. Nowhere else.

The factory reads the mode and builds one Player struct per participant.
The only difference between a bot Player and a human Player is:
  - IsBot is set to true or false
  - inputCh is nil (bot) or an initialized buffered channel (human)

After this function returns, the mode flag no longer exists anywhere.

  // service/match_factory.go

  func NewPlayer(mode string, playerID string) *Player {
      if mode == "bot" {
          return &Player{
              ID:      generateBotName(),
              IsBot:   true,
              inputCh: nil,              // bots never use this
          }
      }
      return &Player{
          ID:      playerID,
          IsBot:   false,
          inputCh: make(chan Action, 1), // WebSocket handler writes here later
      }
  }

The factory calls this twice (once per side), wraps both Players in a Match struct,
and passes the Match to the engine. The engine starts its tick loop.

From this point forward, nothing in the system knows or cares about "mode".
Both participants are just *Players*.


────────────────────────────────────────────────────────────────
STEP 4 — The Match Engine Runs the Tick Loop
────────────────────────────────────────────────────────────────

The engine lives in service/match.go.
It receives a Match which contains []*Player.
It does not read IsBot. It does not check the mode. It calls one method.

Every 100ms, the tick fires. For each player, the engine does this:

  // service/match.go — inside the tick loop
  for _, player := range match.Players {
      action := player.GetAction(currentState)  // same call, every player, every tick
      applyAction(action, &currentState)
      emitEvent(action, match.ID, logWriter)    // goes to the log writer channel
  }

No if-statements. No type switches. No mode checks. The engine is completely
blind to whether it is running a bot match, a player match, or a mixed match.


────────────────────────────────────────────────────────────────
STEP 5 — What Happens Inside GetAction()
────────────────────────────────────────────────────────────────

This is the one place IsBot is read. Internally, inside the Player method.
The engine called the same line for every player. The method handles the difference.

  func (p *Player) GetAction(state MatchState) Action {
      if p.IsBot {
          // RNG is seeded at match creation — deterministic and auditable
          return rollWeightedAction(state.RNG)
      }
      select {
      case action := <-p.inputCh:                // human responded in time
          return action
      case <-time.After(150 * time.Millisecond): // human too slow — idle fallback
          return ActionIdle
      }
  }

One method. One internal check. Fully contained. Nothing leaks out.


────────────────────────────────────────────────────────────────
STEP 6 — How a Real Player's Keypress Gets Into the Channel
────────────────────────────────────────────────────────────────

This is Phase 2 work, but inputCh exists in the Player struct from day one
so Phase 2 can be added without changing any engine or model code.

When a real player is in a match, their browser holds an open WebSocket connection.
When they press a key (e.g. "dodge"):

  1. Browser sends over WebSocket:
       { "match_id": "match_456", "action": "dodge" }

  2. WebSocket handler in controllers/ receives the message.

  3. Handler looks up the active Match by match_id from an in-memory match registry.

  4. Handler finds the Player whose ID matches the sender.

  5. Handler writes the action to the player's channel:
       player.inputCh <- ActionDodge

  6. Inside GetAction(), the select was blocking on inputCh.
     It now unblocks, receives ActionDodge, and returns it to the engine.

  7. The engine processes it exactly like any bot action. Same code path.

The channel is the decoupling point between the network layer and the match engine.
The engine never touches a WebSocket. The WebSocket handler never touches the engine.
They communicate through one buffered channel on the Player struct.


────────────────────────────────────────────────────────────────
STEP 7 — The Event Log Sees Nothing of This
────────────────────────────────────────────────────────────────

Every event written to events.log looks structurally identical
regardless of whether a bot or human caused it.

  A hit from a bot:
  {
    "id": "evt_041", "type": "hit", "match_id": "match_123",
    "payload": { "attacker": "bot_fury", "damage": 12, "target_hp": 44 }
  }

  A hit from a human player:
  {
    "id": "evt_041", "type": "hit", "match_id": "match_456",
    "payload": { "attacker": "player_abc123", "damage": 12, "target_hp": 44 }
  }

Structurally identical. The Redis worker, block builder, leaderboard, and dashboard
read these events. None of them know or care how that hit was decided.
The entire bot-vs-player mechanism is invisible to everything downstream.
```

---

### Where Mode Is Recorded (for Display Only)

The mode flag is gone after the factory, but the match_start event captures participant
metadata for the dashboard and analytics. This is read-only display data — no system
uses it for routing or logic decisions.

```json
{
  "id": "evt_001",
  "type": "match_start",
  "match_id": "match_123",
  "payload": {
    "player_a": { "id": "bot_fury",      "is_bot": true  },
    "player_b": { "id": "player_abc123", "is_bot": false },
    "seed": 849201
  }
}
```

---

### The Rule in One Sentence

> The `mode` flag is read exactly once — in `match_factory.go` — to set `IsBot` and
> initialize `inputCh`. After that, the entire system works with `Player` structs and
> never branches on bot vs human again, except inside `GetAction()` itself.

---

### What to Build Now vs Later

| Thing | Build now | Build later |
|---|---|---|
| `Player` struct with `ID`, `IsBot`, `inputCh` | ✅ | |
| `GetAction()` method with IsBot check + timeout fallback | ✅ | |
| `Match Factory` — `NewPlayer()` that sets IsBot and inputCh | ✅ | |
| Match engine tick loop calling `player.GetAction()` | ✅ | |
| WebSocket handler writing to `player.inputCh` | | ✅ Phase 2 |
| HTTP controller reading `mode` from POST body | | ✅ Phase 2 |

Build the struct, the method, and the factory now.
Phase 2 slots directly into `inputCh` without touching the engine.

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
- **Players per match:** 2 (expandable later)
- **Concurrency:** Multiple matches run in parallel, each in its own goroutine

### Event Types

| Event | Trigger |
|---|---|
| `hit` | RNG roll, depletes target HP |
| `dodge` | RNG roll, grants 1-tick immunity |
| `critical_hit` | RNG roll, applies damage multiplier |
| `powerup_spawn` | RNG roll, max 2 per match |
| `match_end` | Fired when any player's HP reaches 0 — never by RNG |

### Event Probability Weights (per tick)

| Outcome | Probability |
|---|---|
| nothing | ~65% |
| hit | ~18% |
| dodge | ~8% |
| critical_hit | ~5% |
| powerup_spawn | ~4% |
| match_end | consequence only, not rolled |

### Damage Model
- **Base damage:** Variable range (e.g. 5–15 per hit), not fixed — keeps outcomes unpredictable
- **Critical hit:** Multiplier applied to base damage (e.g. 2x), not a flat bonus
- **Starting HP:** 100 per player
- **Tweakability:** All values centralized in `config/config.go` for easy tuning

### Player State (ephemeral, per match)

```
hp            int     // starts at 100
is_dodging    bool    // true = immune this tick
powerup_held  bool    // blocks further powerup spawns if true
```

State is never stored — it's derived by replaying events from the log.
This is what makes seeded RNG auditable.

### Deterministic Seeded Randomness
- Each match receives a seed: `hash(match_id + timestamp)`
- `math/rand` is initialized with this seed at match start
- Given the same seed, the same sequence of events always replays identically
- This is the audit trail — any match result can be independently verified

### Redis Schema

| Key | Type | Purpose |
|---|---|---|
| `leaderboard:global` | Sorted Set | Global player rankings by score |
| `match:{id}:events` | List | Per-match event references |
| `player:{id}:stats` | Hash | Win count, total damage, etc. |

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
chainrush/
├── main.go                        // Wire everything, launch matches, block until done
├── config/
│   └── config.go                  // All tunable constants (tick rate, HP, damage, weights)
├── models/
│   ├── event.go                   // Event struct + EventType constants
│   ├── match.go                   // Match struct, MatchResult
│   └── player.go                  // Player struct, Action type, GetAction() method
├── repo/
│   ├── event_repo.go              // File/DB read+write for events
│   └── leaderboard_repo.go        // Redis leaderboard reads/writes
├── service/
│   ├── log.go                     // Log writer goroutine + fan-out channel logic
│   ├── match.go                   // Match loop: ticks, GetAction calls, event emission
│   └── match_factory.go           // NewPlayer() — only place that reads "mode"
├── workers/
│   ├── event_consumer.go          // Reads fan-out channel, updates Redis/DB
│   └── block_builder.go           // Batches match results into SHA-256 chained blocks
├── controllers/                   // (Phase 2) HTTP + WebSocket handlers
│   └── match_controller.go        // Reads "mode" from request, calls match_factory
└── blockchain/
    └── block.go                   // Block struct, SHA-256 chaining, block store
```

---

## Common Event Struct

```go
// models/event.go
type Event struct {
    ID        string         // unique per event, used for deduplication
    Type      EventType      // hit, dodge, critical_hit, powerup_spawn, match_end
    Timestamp time.Time
    MatchID   string
    Payload   map[string]any // flexible: damage, player names, HP remaining, etc.
}
```

---

## Build Order

### Phase 1 — Backend Foundation

- [ ] **Step 1:** `models/player.go` — `Player` struct, `Action` type, `GetAction()` method
- [ ] **Step 2:** `models/event.go` — `Event` struct and `EventType` constants
- [ ] **Step 3:** `config/config.go` — All constants: tick rate, HP, damage range, crit multiplier, weights
- [ ] **Step 4:** `service/log.go` — Log writer goroutine + channel + fan-out to subscriber channels
- [ ] **Step 5:** `service/match_factory.go` — `NewPlayer()` reads mode once, builds `[]*Player`
- [ ] **Step 6:** `service/match.go` — Tick loop calling `player.GetAction()`, emitting events
- [ ] **Step 7:** `main.go` — Launch multiple concurrent matches, verify `events.log` fills correctly
- [ ] **Step 8:** `workers/event_consumer.go` — Consume fan-out channel, update Redis leaderboard
- [ ] **Step 9:** `blockchain/block.go` — Batch match results into SHA-256 chained blocks

### Phase 2 — API Layer
- [ ] HTTP endpoints: leaderboard, match history, blockchain state
- [ ] `controllers/match_controller.go` — reads `mode` from POST body, calls match factory
- [ ] WebSocket handler — receives player keypresses, writes to `player.inputCh`

### Phase 3 — Frontend Dashboard
- [ ] Retro terminal UI (leaderboards, live event stream, system metrics)
- [ ] Pixel-style visualization layer

---

## Definition of "Phase 1 Complete"

Running `go run main.go` should:

1. Start multiple matches concurrently (all bot players for now)
2. Produce an `events.log` file with valid JSONL — one event per line
3. Show coherent HP progressions per match (hits reduce HP, match ends when HP hits 0)
4. Update `leaderboard:global` in Redis after each match ends
5. Commit at least one block to the blockchain store

---

## Key Design Rules (do not break these)

- **Never write to the log file outside the log writer goroutine**
- **`match_end` is always a consequence of HP reaching 0, never a random roll**
- **Workers must be idempotent** — duplicate event delivery must not corrupt state
- **Player ephemeral state is never persisted** — always derived from event replay
- **All tunable values live in `config/config.go`** — never hardcode game constants elsewhere
- **`mode` is read exactly once in `match_factory.go` and nowhere else**
- **`IsBot` is checked exactly once inside `GetAction()` and nowhere else**
- **The match engine never reads `IsBot`** — it only calls `player.GetAction()`

---

## Open Questions (for future phases)

- Powerup mechanics: what do powerups actually do when used?
- Match matchmaking: how are players paired when queuing?
- Replay system: UI for stepping through a past match event by event
- Horizontal scaling: multiple log writer instances with partitioned match IDs
- Mixed matches: one bot vs one human — already fully supported by the current design
- AI difficulty tiers: aggressive vs defensive bots — add a `BotStrategy` field to `Player`, no struct changes needed