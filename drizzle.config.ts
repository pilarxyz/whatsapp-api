import { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema/schema.ts',
  out: './drizzle',
  driver: 'better-sqlite',
  dbCredentials: {
    url: './db.sqlite',
  },
} satisfies Config;
