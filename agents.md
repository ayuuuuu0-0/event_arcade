# EventArcade — Agent Instructions

> Read this entire file before writing a single line of code.
> These rules are not suggestions. Every instruction here exists because
> the mistake it prevents has real consequences on this codebase.

---

## Project Context

EventArcade is a Go-based event-driven arcade battle simulation. The architecture
document is in EVENTARCADE.md. Read it before touching any file. Every decision
about data flow, concurrency, and naming has already been made — your job is to
implement, not redesign.

---

## The Non-Negotiables

These are hard rules. Do not break them under any circumstance, and do not ask
whether they apply to your specific case. They always apply.

**Never write to the event log file outside the log writer goroutine.**
There is exactly one goroutine that touches `events.log`. Everything else sends
to its channel. If you are writing a file open/write call anywhere outside
`service/log.go`, you are wrong.

**Never check `player.IsBot` outside of `GetAction()`.**
The only `if p.IsBot` in the codebase lives inside the `GetAction()` method in
`models/player.go`. Nowhere else. Not in the engine. Not in workers. Not in
controllers. If you are typing `player.IsBot` anywhere else, stop.

**Never roll RNG to decide `match_end`.**
`match_end` fires when a player's HP reaches zero. It is a consequence, not an
event that gets randomly scheduled. If you are adding `match_end` to any
probability weight table, you are wrong.

**Never hardcode a number that belongs in config.**
Tick duration, starting HP, damage range, crit multiplier, event weights, max
powerups per match — all of these live in `config/config.go`. If you are typing
a raw number like `100` or `0.18` anywhere outside that file, move it to config
first, then reference it.

**Never make workers stateful.**
Workers process events from the fan-out channel and write to Redis or the block
store. They must be idempotent — processing the same event twice must produce
the same result. If your worker holds state between events, it will break replay.

---

## Comments

**Do not add comments to self-explanatory code.**

Bad:
```go
// increment the counter
counter++

// return the result
return result

// create a new player
player := NewPlayer(mode, id)
```

Good: no comment. The code reads itself.

**Only comment when the logic is non-obvious and the why is not clear from the code.**
Acceptable cases: explaining why a particular timeout value was chosen, why a
select has a specific fallback, why a hash is constructed in a specific order
for determinism. One sentence maximum. If you need more than one sentence, the
code needs to be restructured, not commented more.

**Never add section divider comments.**
```go
// --- helpers ---
// === setup ===
// *** main logic ***
```
These are noise. Delete them if you see them.

**Never add closing brace comments.**
```go
} // end if
} // end for
} // end func RunMatch
```
Go has an IDE. This is not 1987.

---

## Naming

**Use the exact names from the architecture document. Do not rename things.**

The established names are:
- `Player` — the participant struct (both bots and humans)
- `IsBot` — the field on Player that indicates bot vs human
- `inputCh` — the channel on Player for human input
- `GetAction()` — the method that resolves an action each tick
- `NewPlayer()` — the factory function in match_factory.go
- `RunMatch()` — the function that runs a match loop
- `EventType` — the type for event type constants
- `LogWriter` — the goroutine-based log writer service

If the architecture doc names something, use that name exactly. Do not rename
`IsBot` to `isBot`, `bot`, `IsMachine`, or anything else.

**Do not abbreviate unless the abbreviation is universally understood.**

Bad: `plr`, `evt`, `cfg`, `mgr`, `svc`, `rng`
Good: `player`, `event`, `config`, `rng` (this one is fine, universally known)

**Function names describe what the function does, not what it is.**

Bad: `PlayerFactory()`, `MatchHandler()`, `EventProcessor()`
Good: `NewPlayer()`, `RunMatch()`, `ProcessEvent()`

---

## Configuration

**Every tunable value lives in `config/config.go`. No exceptions.**

If you are writing any of the following as a raw literal anywhere outside config,
move it:

```
tick duration       → config.TickDuration
starting HP         → config.StartingHP
damage min          → config.DamageMin
damage max          → config.DamageMax
crit multiplier     → config.CritMultiplier
action timeout      → config.PlayerActionTimeout
max powerups        → config.MaxPowerupsPerMatch
prob: nothing       → config.ProbNothing
prob: hit           → config.ProbHit
prob: dodge         → config.ProbDodge
prob: critical_hit  → config.ProbCriticalHit
prob: powerup_spawn → config.ProbPowerupSpawn
```

**Config values are read once at startup. They are not re-read mid-match.**
Do not call config inside a tick loop. Read the value before the loop starts
and pass it in, or reference the package-level constant directly.

---

## Constants (`constants/`)

Production code uses two packages for fixed values. Do not mix them up.

**`config/config.go` — tunable game and runtime behavior.**

Numbers and durations that define how the simulation runs: HP, damage range,
tick duration, action probabilities, channel buffer sizes, log file path.
Change these when balancing gameplay or infrastructure.

**`constants/` — stable production strings used across packages.**

Shared identifiers that are not gameplay tuning, for example JSON payload keys
(`PayloadKeyPlayerID`, `PayloadKeyDamage`). Import `eventarcade/constants` in
service, workers, and controllers when building or reading event payloads.

Do not put smoke-test IDs, fake player names, or fixture match IDs in `constants/`.
Those belong in `test/constants.go` (see Testing).

**Never hardcode a raw string or number in application code when a constant
already exists in `config`, `constants`, or `test`.**

---

## Testing (`test/`)

All verification lives under the repo-root `test/` tree. Do not put smoke-test
logic, fixture IDs, or test harness code in `main.go`.

### Layout

```
test/
├── constants.go          # fixture IDs and counts (smoke / integration only)
├── events.go             # shared builders for fake events (optional)
├── smoke/                # fast end-to-end checks of one subsystem
│   └── *_test.go
└── integration/          # multi-component flows (log + fan-out, match + log, …)
    └── *_test.go
```

| Kind | Location | Purpose |
|------|----------|---------|
| Smoke | `test/smoke/` | One real path through the system (e.g. log writer → JSONL file) |
| Integration | `test/integration/` | Two or more packages wired together |
| Unit | `*_test.go` next to source **or** `test/` | Single function/package behavior |

**Test credentials and fixtures** (`test/constants.go`): fake match IDs, bot
names, event counts, and ID format strings used only by tests. Example:
`MatchIDSmoke`, `PlayerIDBotAlpha`. Never import `eventarcade/test` from
production packages (`main`, `service`, `models`, …).

**Game values in tests** still come from `config` (e.g. `config.DamageMin`).
**Payload keys** in tests use `constants` (e.g. `constants.PayloadKeyDamage`).

### Go convention vs this repo

Go’s default is co-located `foo_test.go` beside `foo.go` in the same package
(often for unexported helpers). **This project standardizes on the root `test/`
folder for smoke and integration tests** so `main` stays production-only and
fixtures stay out of `constants/`.

White-box unit tests that must call unexported symbols may still live as
`package_test` files next to the implementation (e.g. `service/log_test.go`)
when necessary. Prefer black-box tests in `test/` that import public APIs.

### Running tests

```bash
go test ./...          # everything, including test/smoke and test/integration
go test ./test/...     # only repo-root test tree
```

Tests must use `t.TempDir()` for log files and chain files — never append to
the repo’s `events.log` or `chain.json` during `go test`.

### `main.go`

`main.go` wires the running application only. Module “done when” checks that
used to live in `main` (e.g. push 10 fake events) are implemented as tests
under `test/smoke/` instead.

---

## Go-Specific Rules

**Do not use `init()` functions.**
They run invisibly and make the startup sequence hard to follow. Do explicit
setup in `main.go` instead.

**Do not use `panic()` except for truly unrecoverable programmer errors.**
A missing config value is not a panic. A nil channel is not a panic. Return
an error and handle it. If you are writing `panic()` anywhere in service,
worker, or engine code, reconsider.

**Always pass context where goroutines are involved.**
Every goroutine that runs for the lifetime of a match or the application must
accept a `context.Context` and respect cancellation. This is how matches are
stopped cleanly and how the application shuts down without leaking goroutines.

**Do not use `time.Sleep()` for tick timing.**
Use `time.NewTicker()`. Sleep drifts. A ticker compensates.

**Channel directions must be typed in function signatures.**
```go
// Bad
func StartWriter(ch chan Event)

// Good
func StartWriter(ch <-chan Event)  // read-only
func StartWriter(ch chan<- Event)  // write-only
```


**Do not use bare `interface{}` or `any` in new code beyond the Event payload.**
`Event.Payload` is `map[string]any` by design because event payloads are
intentionally flexible. Everywhere else, use concrete types.

**Function length depends on what the function is doing.**
Helper functions, factories, and small handlers should stay under 40 lines — if
they are growing beyond that, they are doing too much. Core logic functions —
tick loops, match engines, event processors — have no line limit. If a core
function is getting long, ask one question: is this one coherent job or multiple
jobs stitched together? If it is one job, leave it. If it is multiple, extract
a sub-function. Use judgment, not line count.

**Error strings are lowercase with no trailing punctuation.**
```go
// Bad
return fmt.Errorf("Failed to write event.")
return fmt.Errorf("Match not found!")

// Good
return fmt.Errorf("failed to write event")
return fmt.Errorf("match not found")
```

---

## File and Package Structure

**One responsibility per file. Do not combine unrelated things.**

Bad: putting the Player struct and the Match struct in one file because
"they're related". They have separate concerns — separate files.

**Package names are single lowercase words. No underscores.**

Bad: `match_engine`, `event_log`, `block_chain`
Good: `engine`, `events`, `blockchain`

**Do not create a `utils` or `helpers` package.**
If something is a utility, it belongs in the package that uses it. A `utils`
package is a sign that ownership of the code is unclear.

**Unexported fields and functions are the default. Export only what is needed
by another package.**

If a field or function is only used within its own package, it starts lowercase.
Only export when another package genuinely needs it.

---

## The Fan-out Channel Pattern

This is the core concurrency pattern of the system. Get it right.

The log writer receives events on one inbound channel. After writing to disk,
it forwards each event to all registered subscriber channels. Workers subscribe
by registering their channel with the writer at startup.

```
[match engine] ──► inbound chan ──► [log writer goroutine] ──► disk
                                              │
                                    for each subscriber:
                                    subscriber.ch <- event
```

**Do not make subscriber channels unbuffered.**
If a worker is slow and the channel blocks, it stalls the log writer which
stalls every match engine. Buffer subscriber channels generously (e.g. 1000).

**Do not drop events silently.**
If a subscriber channel is full, log the dropped event count as a metric.
Do not use a bare `select` with a `default` that discards silently.

**The log writer is the only goroutine that calls `file.Write()`.**
Workers and match engines never open the log file. They only use channels.

---

## What Good Code Looks Like in This Project

A well-written file in this codebase:
- Has no comments on obvious lines
- References config constants, never raw numbers

- Has one clear job per function
- Handles errors explicitly — no `_` on error returns unless truly irrelevant
- Has channel directions typed in every signature
- Compiles with `go vet ./...` and `golint ./...` clean

A poorly-written file in this codebase:
- Has comments on every other line explaining what the code obviously does
- Has `100`, `0.18`, `150` scattered as raw literals
- Has `if player.IsBot` outside of `GetAction()`
- Has a `utils.go` with a grab-bag of functions
- Uses `time.Sleep()` for tick timing
- Has goroutines with no context and no cancellation path

---

## Before You Submit Any Code

Run through this checklist mentally before considering a task done:

- [ ] Does `go build ./...` pass with zero errors?
- [ ] Does `go test ./...` pass?
- [ ] Does `go vet ./...` pass clean?
- [ ] Are fixture IDs and smoke credentials only in `test/`, not `constants/` or `main.go`?
- [ ] Are there any raw number literals outside `config/config.go`?
- [ ] Is `player.IsBot` read anywhere outside `GetAction()`?
- [ ] Does any goroutine lack a `context.Context` parameter?
- [ ] Is `time.Sleep()` used anywhere for tick timing?
- [ ] Are there comments on self-explanatory lines?
- [ ] Do helper or factory functions exceed 40 lines without good reason?
- [ ] Is anything exported that doesn't need to be?
- [ ] Does every error get handled, not ignored?

If any of these fail, fix them before marking the task complete.