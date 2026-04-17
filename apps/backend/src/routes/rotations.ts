import { Hono } from 'hono'
import { RotationService } from '../services/RotationService'
import { ScheduleService } from '../services/ScheduleService'
import { authMiddleware } from '../auth'
import type { JwtPayload } from '../auth'
import type { AppDB } from '../db'
import type { Variables } from '../types'

export const rotationRoutes = new Hono<{ Variables: Variables }>()

rotationRoutes.use('/*', authMiddleware)

// スケジュールのローテーションデータ取得
rotationRoutes.get('/:scheduleId', async (c) => {
  const scheduleId = Number(c.req.param('scheduleId'))
  const service = new RotationService(c.get('db') as AppDB)
  const data = await service.getRotationData(scheduleId)
  if (!data) return c.json({ error: 'スケジュールが見つかりません' }, 404)
  return c.json(data)
})

// セル更新（upsert / 削除）
rotationRoutes.put('/:scheduleId/cell', async (c) => {
  const payload = c.get('jwtPayload') as JwtPayload
  const scheduleId = Number(c.req.param('scheduleId'))

  if (!payload.isAdmin) {
    const schedService = new ScheduleService(c.get('db') as AppDB)
    const schedule = await schedService.getById(scheduleId)
    if (!schedule || schedule.mcUserId !== payload.sub) {
      return c.json({ error: '権限がありません' }, 403)
    }
  }

  const body = await c.req.json<{ timeSlot: string; columnKey: string; userId: number | null }>()
  if (!body.timeSlot || !body.columnKey) {
    return c.json({ error: 'timeSlot と columnKey は必須です' }, 400)
  }
  const service = new RotationService(c.get('db') as AppDB)
  const result = await service.upsertCell(scheduleId, body.timeSlot, body.columnKey, body.userId ?? null)
  return c.json(result)
})

// スケジュールのローテーション全クリア
rotationRoutes.delete('/:scheduleId', async (c) => {
  const payload = c.get('jwtPayload') as JwtPayload
  const scheduleId = Number(c.req.param('scheduleId'))

  if (!payload.isAdmin) {
    const schedService = new ScheduleService(c.get('db') as AppDB)
    const schedule = await schedService.getById(scheduleId)
    if (!schedule || schedule.mcUserId !== payload.sub) {
      return c.json({ error: '権限がありません' }, 403)
    }
  }

  const service = new RotationService(c.get('db') as AppDB)
  await service.clearSchedule(scheduleId)
  return c.json({ message: 'クリアしました' })
})
