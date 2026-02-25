// Detects better-sqlite3 native module ABI mismatch and auto-rebuilds.
// Runs via Electron's Node (ELECTRON_RUN_AS_NODE=1) so the check matches
// the runtime that actually executes tests.
try {
  require('better-sqlite3');
} catch (e) {
  if (e.message.includes('NODE_MODULE_VERSION')) {
    const { execSync } = require('child_process');
    console.log('\nbetter-sqlite3 native module mismatch — rebuilding for Electron...\n');
    execSync('npx electron-rebuild -f -w better-sqlite3', { stdio: 'inherit' });
  } else {
    throw e;
  }
}
