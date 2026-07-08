# ANIMA Trace Format v1

A signed, self-verifying record of a deterministic ANIMA run. Anyone with the
trace file can reproduce it byte-for-byte and confirm it wasn't tampered with.

## Structure
    {
      "anima_trace_version": "1.0",
      "engine": { "package": "anima-core", "version": "0.1.0" },
      "run": {
        "archetype": "paranoia",
        "seed": "demo-42",
        "signals": [ { "fantasy":1, "agendaGap":0.9 }, ... ]   // input per turn
      },
      "trajectory": [ { "E":.., "T":.., ..., "irruption":false, "turn":1 }, ... ],
      "integrity": {
        "trajectory_hash": "sha256:...",   // hash of the trajectory
        "input_hash": "sha256:...",        // hash of archetype+seed+signals
        "algorithm": "sha256"
      }
    }

## Verification contract
`verifyTrace(trace)` re-runs the engine from run.{archetype,seed,signals}, then:
  1. recomputes the trajectory and compares byte-for-byte to trace.trajectory
  2. recomputes both hashes and compares to trace.integrity
  3. returns { valid, reproduced, hashMatch, details }

A trace is VALID iff the re-run reproduces the recorded trajectory exactly AND
the recorded hashes match. Any divergence (tampered trajectory, wrong seed,
engine version mismatch) is reported precisely.
