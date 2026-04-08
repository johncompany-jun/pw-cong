import { Hono } from 'hono'
import { AuthService } from '../services/AuthService'
import { authMiddleware, type JwtPayload, getSecret } from '../auth'
import type { AppDB } from '../db'
import type { Variables } from '../types'

export const authRoutes = new Hono<{ Variables: Variables }>()

authRoutes.post('/login', async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>()
  if (!email || !password) {
    return c.json({ error: 'メールアドレスとパスワードを入力してください' }, 400)
  }
  try {
    const service = new AuthService(c.get('db') as AppDB, getSecret(c))
    const result = await service.login(email, password)
    return c.json(result)
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'ログインに失敗しました' }, 401)
  }
})

authRoutes.get('/me', authMiddleware, async (c) => {
  const payload = c.get('jwtPayload') as JwtPayload
  try {
    const service = new AuthService(c.get('db') as AppDB, getSecret(c))
    const user = await service.me(payload.sub)
    return c.json(user)
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

authRoutes.put('/me/password', authMiddleware, async (c) => {
  const payload = c.get('jwtPayload') as JwtPayload
  const { currentPassword, newPassword } = await c.req.json<{
    currentPassword: string
    newPassword: string
  }>()
  if (!currentPassword || !newPassword) {
    return c.json({ error: 'パスワードを入力してください' }, 400)
  }
  try {
    const service = new AuthService(c.get('db') as AppDB, getSecret(c))
    await service.changePassword(payload.sub, currentPassword, newPassword)
    return c.json({ message: 'パスワードを変更しました' })
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})
