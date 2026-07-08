'use strict';
// ANIMA Trace Format v1 — record + verify deterministic runs.
const crypto = require('crypto');
const { Engine } = require('./src/engine');

const TRACE_VERSION = '1.0';
const ENGINE_VERSION = '0.1.0';

function sha256(obj){
  return 'sha256:' + crypto.createHash('sha256')
    .update(typeof obj === 'string' ? obj : JSON.stringify(obj))
    .digest('hex');
}

// Record a run: given archetype/seed/signals, produce a signed trace.
function recordTrace({ archetype, seed, signals }){
  if (!Array.isArray(signals)) throw new TypeError('signals must be an array');
  const eng = new Engine({ archetype, seed });
  const trajectory = signals.map(s => eng.step(s));
  const run = { archetype, seed, signals };
  return {
    anima_trace_version: TRACE_VERSION,
    engine: { package: 'anima-core', version: ENGINE_VERSION },
    run,
    trajectory,
    integrity: {
      trajectory_hash: sha256(trajectory),
      input_hash: sha256({ archetype, seed, signals }),
      algorithm: 'sha256'
    }
  };
}

// Verify a trace: re-run and compare byte-for-byte + hash check.
function verifyTrace(trace){
  const details = [];
  let ok = true;
  const fail = m => { ok = false; details.push(m); };

  if (!trace || typeof trace !== 'object') return { valid:false, details:['trace is not an object'] };
  if (trace.anima_trace_version !== TRACE_VERSION)
    fail(`trace version mismatch: got ${trace.anima_trace_version}, expected ${TRACE_VERSION}`);
  if (!trace.run || !trace.integrity || !Array.isArray(trace.trajectory))
    return { valid:false, details:['malformed trace: missing run/integrity/trajectory'] };
  if (trace.engine && trace.engine.version !== ENGINE_VERSION)
    fail(`engine version mismatch: trace ${trace.engine.version} vs local ${ENGINE_VERSION}`);

  // 1. re-run
  let reproduced = false, hashMatch = false;
  try {
    const { archetype, seed, signals } = trace.run;
    const eng = new Engine({ archetype, seed });
    const rerun = signals.map(s => eng.step(s));
    reproduced = JSON.stringify(rerun) === JSON.stringify(trace.trajectory);
    if (!reproduced) {
      fail('re-run trajectory does NOT match recorded trajectory (tampered or non-deterministic)');
      // locate first divergence
      for (let i=0;i<Math.max(rerun.length, trace.trajectory.length);i++){
        if (JSON.stringify(rerun[i]) !== JSON.stringify(trace.trajectory[i])){
          details.push(`  first divergence at turn ${i+1}`); break;
        }
      }
    }
    // 2. hash check (independent of re-run)
    const th = sha256(trace.trajectory), ih = sha256(trace.run);
    const tOk = th === trace.integrity.trajectory_hash;
    const iOk = ih === trace.integrity.input_hash;
    hashMatch = tOk && iOk;
    if (!tOk) fail('recorded trajectory_hash does not match recorded trajectory');
    if (!iOk) fail('recorded input_hash does not match recorded run inputs');
  } catch(e){
    fail('re-run threw: ' + e.message);
  }

  return { valid: ok && reproduced && hashMatch, reproduced, hashMatch,
    details: details.length ? details : ['all checks passed'] };
}

module.exports = { recordTrace, verifyTrace, sha256, TRACE_VERSION };
