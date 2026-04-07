import { Hono } from 'hono'
import { RotationService } from '../services/RotationService'
import { authMiddleware, adminMiddleware } from '../auth'

const service = new RotationService()
export const rotationRoutes = new Hono()

rotationRoutes.use('/*', authMiddleware)

// スケジュールのローテーションデータ取得
rotationRoutes.get('/:scheduleId', async (c) => {
  const scheduleId = Number(c.req.param('scheduleId'))
  const data = await service.getRotationData(scheduleId)
  if (!data) return c.json({ error: 'スケジュールが見つかりません' }, 404)
  return c.json(data)
})

// セル更新（upsert / 削除）
rotationRoutes.put('/:scheduleId/cell', adminMiddleware, async (c) => {
  const scheduleId = Number(c.req.param('scheduleId'))
  const body = await c.req.json<{ timeSlot: string; columnKey: string; userId: number | null }>()
  if (!body.timeSlot || !body.columnKey) {
    return c.json({ error: 'timeSlot と columnKey は必須です' }, 400)
  }
  const result = await service.upsertCell(scheduleId, body.timeSlot, body.columnKey, body.userId ?? null)
  return c.json(result)
})

// スケジュールのローテーション全クリア
rotationRoutes.delete('/:scheduleId', adminMiddleware, async (c) => {
  const scheduleId = Number(c.req.param('scheduleId'))
  await service.clearSchedule(scheduleId)
  return c.json({ message: 'クリアしました' })
})
