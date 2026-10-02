// Cloudflare Workers エントリポイント
/// <reference types="@cloudflare/workers-types" />
import { createApp } from './app'
import { createD1Db } from './db/d1'
import { R2Storage } from './storage/R2Storage'

type Env = {
  DB: D1Database
  JWT_SECRET: string
  FRONTEND_URL: string
  LAYOUTS_BUCKET: R2Bucket
}

// D1 バインディングから db を生成してコンテキストにセット
const app = createApp(async (c, next) => {
  const env = c.env as Env
  c.set('db', createD1Db(env.DB))
  c.set('storage', new R2Storage(env.LAYOUTS_BUCKET))
  await next()
})

export default app
