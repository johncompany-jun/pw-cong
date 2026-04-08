import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Context, Next } from 'hono'
import type { Variables } from './types'
import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import { spotRoutes } from './routes/spots'
import { scheduleRoutes } from './routes/schedules'
import { applicationRoutes } from './routes/applications'
import { specialAssignmentRoutes } from './routes/specialAssignments'
import { rotationRoutes } from './routes/rotations'

export function createApp(dbMiddleware: (c: Context<{ Variables: Variables }>, next: Next) => Promise<void>) {
  const app = new Hono<{ Variables: Variables }>()

  // db を最初にセット（全ルートより前）
  app.use('*', dbMiddleware)

  app.use('/api/*', cors({
    origin: (origin, c) => {
      const env = c.env as Record<string, string> | undefined
      const allowed = env?.FRONTEND_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:5173'
      return origin === allowed ? origin : null
    },
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  }))

  app.route('/api', authRoutes)
  app.route('/api/users', userRoutes)
  app.route('/api/spots', spotRoutes)
  app.route('/api/schedules', scheduleRoutes)
  app.route('/api/applications', applicationRoutes)
  app.route('/api/special-assignments', specialAssignmentRoutes)
  app.route('/api/rotations', rotationRoutes)

  app.get('/health', (c) => c.json({ status: 'ok' }))

  return app
}
