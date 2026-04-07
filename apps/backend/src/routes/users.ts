import { Hono } from 'hono'
import { UserService } from '../services/UserService'
import { authMiddleware, adminMiddleware, type JwtPayload } from '../auth'

const userService = new UserService()
export const userRoutes = new Hono()

userRoutes.use('/*', authMiddleware, adminMiddleware)

userRoutes.get('/', async (c) => {
  const list = await userService.list()
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
    const user = await userService.create(body)
    return c.json(user, 201)
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

userRoutes.post('/bulk', async (c) => {
  const { rows } = await c.req.json<{
    rows: { email: string; name: string; gender: string; password: string }[]
  }>()
  if (!Array.isArray(rows) || rows.length === 0) {
    return c.json({ error: '行データが必要です' }, 400)
  }
  const results = await userService.bulk(rows)
  return c.json(results)
})

userRoutes.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const payload = c.get('jwtPayload') as JwtPayload
  if (id === payload.sub) {
    return c.json({ error: '自分自身は編集できません' }, 400)
  }
  const body = await c.req.json<{ name?: string; email?: string; isAdmin?: boolean }>()
  try {
    const user = await userService.update(id, body)
    return c.json(user)
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

userRoutes.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const payload = c.get('jwtPayload') as JwtPayload
  if (id === payload.sub) {
    return c.json({ error: '自分自身は削除できません' }, 400)
  }
  await userService.delete(id)
  return c.json({ message: '削除しました' })
})
