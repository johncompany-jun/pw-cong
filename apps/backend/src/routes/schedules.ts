import { Hono } from 'hono'
import { ScheduleService } from '../services/ScheduleService'
import { authMiddleware, adminMiddleware } from '../auth'
import { ScheduleStatus, type ScheduleStatusType } from '../constants/scheduleStatus'

const scheduleService = new ScheduleService()
export const scheduleRoutes = new Hono()

scheduleRoutes.use('/*', authMiddleware)

scheduleRoutes.get('/', async (c) => {
  const page = Math.max(1, Number(c.req.query('page') ?? 1))
  const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') ?? 10)))
  const status = c.req.query('status') as ScheduleStatusType | undefined

  const validStatus = status && Object.values(ScheduleStatus).includes(status) ? status : undefined
  const result = await scheduleService.list({ page, limit, status: validStatus })
  return c.json(result)
})

scheduleRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const result = await scheduleService.getById(id)
  if (!result) return c.json({ error: 'スケジュールが見つかりません' }, 404)
  return c.json(result)
})

scheduleRoutes.post('/', adminMiddleware, async (c) => {
  const body = await c.req.json<{ date: string; spotId: number; status?: ScheduleStatusType; mcUserId?: number | null }>()
  if (!body.date || !body.spotId) {
    return c.json({ error: '日付とスポットは必須です' }, 400)
  }
  try {
    const schedule = await scheduleService.create(body)
    return c.json(schedule, 201)
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

scheduleRoutes.put('/:id', adminMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  try {
    const schedule = await scheduleService.update(id, body)
    return c.json(schedule)
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

scheduleRoutes.delete('/:id', adminMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  await scheduleService.delete(id)
  return c.json({ message: '削除しました' })
})
