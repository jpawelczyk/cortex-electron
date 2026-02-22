import { initDatabase, closeDatabase } from './db.js';
import crypto from 'crypto';

async function createTestData() {
  const db = await initDatabase();
  const now = new Date().toISOString();
  
  // Create project
  const projectId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO projects (id, title, description, status, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)`,
    [projectId, 'Sync test: Project from Claudius', 'Testing bidirectional sync', 'active', now, now]
  );
  console.log('Created project:', projectId);
  
  // Create note
  const noteId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO notes (id, title, content, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [noteId, 'Sync test: Note from Claudius', 'This note was created by the AI agent to test sync.', now, now]
  );
  console.log('Created note:', noteId);
  
  // Wait for sync
  console.log('Waiting for sync...');
  await new Promise(r => setTimeout(r, 3000));
  
  await closeDatabase();
  console.log('Done!');
}

createTestData().catch(console.error);
