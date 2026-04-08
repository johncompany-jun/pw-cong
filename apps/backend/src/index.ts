import { createApp } from './app'
import { db } from './db'

// ローカル開発 (Docker / Bun): bun:sqlite の db をコンテキストにセット
const app = createApp(async (c, next) => {
  c.set('db', db)
  await next()
})

const port = Number(process.env.PORT ?? 3000)

console.log(`Server running at http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
