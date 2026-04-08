// Cloudflare Workers エントリポイント
/// <reference types="@cloudflare/workers-types" />
import { createApp } from './app'
import { createD1Db } from './db/d1'

type Env = {
  DB: D1Database
  JWT_SECRET: string
  FRONTEND_URL: string
}

// D1 バインディングから db を生成してコンテキストにセット
const app = createApp(async (c, next) => {
  const env = c.env as Env
  c.set('db', createD1Db(env.DB))
  await next()
})

export default app
