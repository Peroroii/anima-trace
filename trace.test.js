const { recordTrace, verifyTrace, sha256 } = require('./trace.js');

const mkSignals = n => Array.from({length:n},(_,t)=>({fantasy:t%2, agendaGap:0.9, closure:0.2}));

describe('recordTrace', () => {
  test('produces a well-formed trace', () => {
    const tr = recordTrace({archetype:'paranoia', seed:'s', signals:mkSignals(10)});
    expect(tr.anima_trace_version).toBe('1.0');
    expect(tr.trajectory).toHaveLength(10);
    expect(tr.integrity.trajectory_hash).toMatch(/^sha256:/);
    expect(tr.integrity.input_hash).toMatch(/^sha256:/);
  });
  test('throws if signals not array', () => {
    expect(() => recordTrace({archetype:'paranoia', seed:'s', signals:'x'})).toThrow(TypeError);
  });
  test('same inputs → identical trace (determinism)', () => {
    const a = recordTrace({archetype:'obsesion', seed:'k', signals:mkSignals(15)});
    const b = recordTrace({archetype:'obsesion', seed:'k', signals:mkSignals(15)});
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('verifyTrace — happy path', () => {
  test('clean trace is VALID', () => {
    const tr = recordTrace({archetype:'paranoia', seed:'demo', signals:mkSignals(12)});
    const r = verifyTrace(tr);
    expect(r.valid).toBe(true);
    expect(r.reproduced).toBe(true);
    expect(r.hashMatch).toBe(true);
  });
  test('all archetypes produce verifiable traces', () => {
    for (const a of ['histeria','obsesion','fobia','melancolia','paranoia','esquizofrenia','perversion']){
      const tr = recordTrace({archetype:a, seed:'x', signals:mkSignals(8)});
      expect(verifyTrace(tr).valid).toBe(true);
    }
  });
});

describe('verifyTrace — tamper detection', () => {
  test('tampered trajectory value → INVALID, pinpoints turn', () => {
    const tr = recordTrace({archetype:'paranoia', seed:'demo', signals:mkSignals(12)});
    tr.trajectory[5].P = 0.999;
    const r = verifyTrace(tr);
    expect(r.valid).toBe(false);
    expect(r.reproduced).toBe(false);
    expect(r.details.some(d => /turn 6/.test(d))).toBe(true);
  });
  test('tampered seed (trajectory kept) → INVALID', () => {
    const tr = recordTrace({archetype:'paranoia', seed:'real-seed', signals:mkSignals(10)});
    tr.run.seed = 'fake-seed';
    const r = verifyTrace(tr);
    expect(r.valid).toBe(false);
  });
  test('faked hash but real trajectory → still caught if trajectory tampered', () => {
    const tr = recordTrace({archetype:'obsesion', seed:'s', signals:mkSignals(10)});
    tr.trajectory[2].A = 0.123;
    tr.integrity.trajectory_hash = sha256(tr.trajectory); // attacker recomputes hash
    const r = verifyTrace(tr);
    // hash now matches tampered trajectory, BUT re-run still diverges
    expect(r.valid).toBe(false);
    expect(r.reproduced).toBe(false);
  });
  test('malformed trace → INVALID not crash', () => {
    expect(verifyTrace(null).valid).toBe(false);
    expect(verifyTrace({}).valid).toBe(false);
    expect(verifyTrace({anima_trace_version:'1.0'}).valid).toBe(false);
  });
  test('engine version mismatch is flagged', () => {
    const tr = recordTrace({archetype:'paranoia', seed:'s', signals:mkSignals(6)});
    tr.engine.version = '9.9.9';
    const r = verifyTrace(tr);
    expect(r.valid).toBe(false);
    expect(r.details.some(d => /engine version/.test(d))).toBe(true);
  });
});

describe('the security property', () => {
  test('an attacker who alters behavior cannot forge a valid trace', () => {
    // attacker wants to claim an agent was calm (low P) when it was not
    const tr = recordTrace({archetype:'paranoia', seed:'audit', signals:mkSignals(15)});
    tr.trajectory.forEach(t => { t.P = 0.1; });          // fake "calm" behavior
    tr.integrity.trajectory_hash = sha256(tr.trajectory); // recompute hash to hide it
    const r = verifyTrace(tr);
    // the re-run from seed reproduces the REAL trajectory, exposing the forgery
    expect(r.valid).toBe(false);
    expect(r.reproduced).toBe(false);
  });
});
