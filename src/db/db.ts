import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { users } from './schema/users';
import { eq } from 'drizzle-orm';
const sqlite = new Database('db.sqlite');
const db: BetterSQLite3Database = drizzle(sqlite);

export async function insertUser(phone: string, otp: string) {
  return db.insert(users).values({ phone, otp }).returning();
}

export async function getUser(phone: string) {
  return db.select().from(users).where(eq(users.phone, phone));
}

export async function updateUser(phone: string, otp: string) {
  const currentTimestamp = new Date().toISOString();
  return db
    .update(users)
    .set({ otp, timestamp: currentTimestamp })
    .where(eq(users.phone, phone));
}

export async function deleteUser(phone: string) {
  return db.delete(users).where(eq(users.phone, phone));
}
