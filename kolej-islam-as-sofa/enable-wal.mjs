import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:dev.db' });
await client.execute('PRAGMA journal_mode = WAL');
console.log('✓ WAL mode enabled on dev.db');
client.close();
