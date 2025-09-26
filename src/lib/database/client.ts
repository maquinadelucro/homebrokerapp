import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { schema } from '../../../shared/schema';
import ws from 'ws';

// Configure Neon for serverless environment
neonConfig.webSocketConstructor = ws;

// Create connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create Drizzle client
export const db = drizzle(pool, { schema });

// Export types
export type DbClient = typeof db;
export * from '../../../shared/schema';