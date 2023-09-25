import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('table', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  phone: integer('phone').unique(),
  otp: integer('otp'),
  timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`),
});

export type User = typeof users.$inferSelect; // return type when queried
export type NewUser = typeof users.$inferInsert; // insert type
