import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { users } from './schema/users';
const sqlite = new Database('sqlite.db');
const db: BetterSQLite3Database = drizzle(sqlite);

export async function insertUser(phone: number, otp: number) {
  return db.insert(users).values({ phone, otp }).returning();
}
