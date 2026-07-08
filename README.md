# anima-trace

![CI](https://github.com/Peroroii/anima-trace/actions/workflows/ci.yml/badge.svg) ![npm](https://img.shields.io/npm/v/anima-trace) ![license](https://img.shields.io/badge/license-MIT-green) ![node](https://img.shields.io/badge/node-%3E%3D16-brightgreen)

Self-verifying trace format for deterministic ANIMA runs. Record a run, and
anyone can reproduce it byte-for-byte and prove it wasn't tampered with.

## Install
    npm install anima-trace

## Verify a run from the terminal
    npx anima-verify run.json
    #  ✓ VALID — this run is authentic and reproducible
    #  ✗ INVALID — first divergence at turn 6

## Programmatic
    const { recordTrace, verifyTrace } = require('anima-trace');
    const trace = recordTrace({ archetype:'paranoia', seed:'audit-1', signals });
    const result = verifyTrace(trace);   // { valid, reproduced, hashMatch, details }

## The security property
An attacker who alters recorded behavior — even recomputing the hashes to hide
it — cannot forge a valid trace: re-running from the seed reproduces the real
trajectory and exposes any divergence. This turns "trust my run is reproducible"
into "verify it yourself in one command."

See SCHEMA.md for the full trace format specification.
