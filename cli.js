#!/usr/bin/env node
'use strict';
// anima-verify — verify an ANIMA trace file from the terminal
const fs = require('fs');
const { verifyTrace } = require('./trace.js');

const path = process.argv[2];
if (!path){ console.error('Usage: anima-verify <trace.json>'); process.exit(2); }
let trace;
try { trace = JSON.parse(fs.readFileSync(path,'utf8')); }
catch(e){ console.error('Cannot read/parse:', e.message); process.exit(2); }

const r = verifyTrace(trace);
console.log('\n  anima-verify  ·  trace format v' + (trace.anima_trace_version||'?'));
console.log('  ' + '─'.repeat(50));
console.log('  archetype     ', trace.run && trace.run.archetype);
console.log('  seed          ', trace.run && trace.run.seed);
console.log('  turns         ', trace.trajectory && trace.trajectory.length);
console.log('  reproduced    ', r.reproduced ? '✓ byte-identical re-run' : '✗ diverged');
console.log('  hash match    ', r.hashMatch ? '✓ integrity ok' : '✗ hash mismatch');
console.log('  ' + '─'.repeat(50));
if (r.valid){
  console.log('  ✓ VALID — this run is authentic and reproducible\n');
  process.exit(0);
} else {
  console.log('  ✗ INVALID');
  r.details.forEach(d => console.log('    ' + d));
  console.log('');
  process.exit(1);
}
