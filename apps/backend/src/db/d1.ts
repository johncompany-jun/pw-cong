/// <reference types="@cloudflare/workers-types" />
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'
import type { AppDB } from './index'

export function createD1Db(d1: D1Database): AppDB {
  return drizzle(d1, { schema }) as unknown as AppDB
}
