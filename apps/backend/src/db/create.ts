import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import * as schema from './schema'

export function createDb(url: string) {
  const sqlite = new Database(url)
  return drizzle(sqlite, { schema })
}
