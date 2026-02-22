import { initDatabase, closeDatabase } from './db.js';

async function main(): Promise<void> {
  console.log('Starting Cortex agent...');

  const db = await initDatabase();
  console.log('Database initialized, sync connected.');

  db.registerListener({
    statusChanged: (status) => {
      console.log(
        `Sync: connected=${status.connected} hasSynced=${status.hasSynced} uploading=${status.dataFlowStatus?.uploading ?? false} downloading=${status.dataFlowStatus?.downloading ?? false}`,
      );
    },
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    await closeDatabase();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep process alive
  setInterval(() => {}, 60_000);

  console.log('Cortex agent syncing. Press Ctrl+C to stop.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
