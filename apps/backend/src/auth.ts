import { sign, verify } from 'hono/jwt'
import type { Context, Next } from 'hono'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
const JWT_EXPIRES_IN = 60 * 60 * 24 * 7 // 7 days (seconds)

export type JwtPayload = {
  sub: number
  email: string
  isAdmin: boolean
  exp: number
}

export async function generateToken(payload: Omit<JwtPayload, 'exp'>): Promise<string> {
  return sign(
    { ...payload, exp: Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN },
    JWT_SECRET,
    'HS256',
  )
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  return verify(token, JWT_SECRET, 'HS256') as Promise<JwtPayload>
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: '認証が必要です' }, 401)
  }

  const token = authHeader.slice(7)
  try {
    const payload = await verifyToken(token)
    c.set('jwtPayload', payload)
    await next()
  } catch {
    return c.json({ error: 'トークンが無効です' }, 401)
  }
}

export async function adminMiddleware(c: Context, next: Next) {
  const payload = c.get('jwtPayload') as JwtPayload
  if (!payload?.isAdmin) {
    return c.json({ error: '管理者権限が必要です' }, 403)
  }
  await next()
}
