import { Hono } from 'hono'
import { UserService } from '../services/UserService'
import { authMiddleware, adminMiddleware, type JwtPayload } from '../auth'
import type { AppDB } from '../db'
import type { Variables } from '../types'

export const userRoutes = new Hono<{ Variables: Variables }>()

userRoutes.use('/*', authMiddleware, adminMiddleware)

userRoutes.get('/', async (c) => {
  const service = new UserService(c.get('db') as AppDB)
  const list = await service.list()
  return c.json(list)
})

userRoutes.post('/', async (c) => {
  const body = await c.req.json<{
    email: string
    name: string
    password?: string
    isAdmin: boolean
    gender: string | null
  }>()
  if (!body.email || !body.name) {
    return c.json({ error: 'メールアドレスと名前は必須です' }, 400)
  }
  try {
    const service = new UserService(c.get('db') as AppDB)
    const user = await service.create(body)
    return c.json(user, 201)
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

userRoutes.post('/bulk', async (c) => {
  const body = await c.req.json<{ rows: { email: string; name: string; gender: string; password: string }[] }>()
  if (!Array.isArray(body.rows)) {
    return c.json({ error: '無効なデータです' }, 400)
  }
  const service = new UserService(c.get('db') as AppDB)
  const results = await service.bulk(body.rows)
  return c.json(results)
})

userRoutes.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ name?: string; email?: string; isAdmin?: boolean; gender?: string | null }>()
  try {
    const service = new UserService(c.get('db') as AppDB)
    const user = await service.update(id, body)
    return c.json(user)
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

userRoutes.delete('/:id', async (c) => {
  const payload = c.get('jwtPayload') as JwtPayload
  const id = Number(c.req.param('id'))
  if (payload.sub === id) {
    return c.json({ error: '自分自身は削除できません' }, 400)
  }
  const service = new UserService(c.get('db') as AppDB)
  await service.delete(id)
  return c.json({ message: '削除しました' })
})
