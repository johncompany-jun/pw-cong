import { Hono } from 'hono'
import type { AppDB } from './db'
import type { JwtPayload } from './auth'
import type { LayoutStorage } from './storage/types'

export type Variables = {
  db: AppDB
  jwtPayload: JwtPayload
  storage: LayoutStorage
}

// 全ルートで共通して使う型付き Hono インスタンス型
export type AppHono = Hono<{ Variables: Variables }>
