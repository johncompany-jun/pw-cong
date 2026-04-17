import { Hono } from 'hono'
import { ScheduleService } from '../services/ScheduleService'
import { authMiddleware, adminMiddleware } from '../auth'
import type { JwtPayload } from '../auth'
import { ScheduleStatus, type ScheduleStatusType } from '../constants/scheduleStatus'
import type { AppDB } from '../db'
import type { Variables } from '../types'

export const scheduleRoutes = new Hono<{ Variables: Variables }>()

scheduleRoutes.use('/*', authMiddleware)

scheduleRoutes.get('/', async (c) => {
  const page = Math.max(1, Number(c.req.query('page') ?? 1))
  const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') ?? 10)))
  const status = c.req.query('status') as ScheduleStatusType | undefined

  const validStatus = status && Object.values(ScheduleStatus).includes(status) ? status : undefined
  const service = new ScheduleService(c.get('db') as AppDB)
  const result = await service.list({ page, limit, status: validStatus })
  return c.json(result)
})

scheduleRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const service = new ScheduleService(c.get('db') as AppDB)
  const result = await service.getById(id)
  if (!result) return c.json({ error: 'スケジュールが見つかりません' }, 404)
  return c.json(result)
})

scheduleRoutes.post('/', adminMiddleware, async (c) => {
  const body = await c.req.json<{ date: string; spotId: number; status?: ScheduleStatusType; mcUserId?: number | null }>()
  if (!body.date || !body.spotId) {
    return c.json({ error: '日付とスポットは必須です' }, 400)
  }
  try {
    const service = new ScheduleService(c.get('db') as AppDB)
    const schedule = await service.create(body)
    return c.json(schedule, 201)
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

scheduleRoutes.put('/:id', async (c) => {
  const payload = c.get('jwtPayload') as JwtPayload
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const service = new ScheduleService(c.get('db') as AppDB)

  if (!payload.isAdmin) {
    const schedule = await service.getById(id)
    if (!schedule || schedule.mcUserId !== payload.sub) {
      return c.json({ error: '管理者権限が必要です' }, 403)
    }
    const allowedBody: Record<string, unknown> = {}
    if ('rotationNotes' in body) allowedBody.rotationNotes = body.rotationNotes
    if ('status' in body) allowedBody.status = body.status
    try {
      const updated = await service.update(id, allowedBody)
      return c.json(updated)
    } catch (e: unknown) {
      return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
    }
  }

  try {
    const schedule = await service.update(id, body)
    return c.json(schedule)
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

scheduleRoutes.delete('/:id', adminMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  const service = new ScheduleService(c.get('db') as AppDB)
  await service.delete(id)
  return c.json({ message: '削除しました' })
})
