import { Hono } from 'hono'
import { RotationService } from '../services/RotationService'
import { ScheduleService } from '../services/ScheduleService'
import { NotificationService } from '../services/NotificationService'
import { ScheduleStatus } from '../constants/scheduleStatus'
import { authMiddleware } from '../auth'
import type { JwtPayload } from '../auth'
import type { AppDB } from '../db'
import type { Variables } from '../types'

const NOTIFICATION_FROM = 'noreply@pw-assistant.com'

function readEnv(c: { env?: unknown }, key: string): string | undefined {
  const env = c.env as Record<string, string> | undefined
  return env?.[key] ?? process.env[key]
}

export const rotationRoutes = new Hono<{ Variables: Variables }>()

rotationRoutes.use('/*', authMiddleware)

// スケジュールのローテーションデータ取得
rotationRoutes.get('/:scheduleId', async (c) => {
  const payload = c.get('jwtPayload') as JwtPayload
  const scheduleId = Number(c.req.param('scheduleId'))
  const schedService = new ScheduleService(c.get('db') as AppDB)
  const canView = await schedService.canViewSchedule(scheduleId, payload.sub, payload.isAdmin)
  if (!canView) return c.json({ error: 'スケジュールが見つかりません' }, 404)
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

// 通知下書き取得（admin のみ）
rotationRoutes.get('/:scheduleId/notify-draft', async (c) => {
  const payload = c.get('jwtPayload') as JwtPayload
  if (!payload.isAdmin) return c.json({ error: '権限がありません' }, 403)
  const scheduleId = Number(c.req.param('scheduleId'))
  const frontendUrl = readEnv(c, 'FRONTEND_URL') ?? 'http://localhost:5173'
  const service = new NotificationService(c.get('db') as AppDB)
  const data = await service.getDraft(scheduleId, frontendUrl)
  if (!data) return c.json({ error: 'スケジュールが見つかりません' }, 404)
  return c.json(data)
})

// 通知送信（admin のみ、確定済みスケジュールのみ）
rotationRoutes.post('/:scheduleId/notify', async (c) => {
  const payload = c.get('jwtPayload') as JwtPayload
  if (!payload.isAdmin) return c.json({ error: '権限がありません' }, 403)
  const scheduleId = Number(c.req.param('scheduleId'))
  const body = await c.req.json<{ subject?: string; body?: string; additionalUserIds?: number[] }>()
  if (!body.subject?.trim() || !body.body?.trim()) {
    return c.json({ error: '件名と本文は必須です' }, 400)
  }
  const additionalUserIds = Array.isArray(body.additionalUserIds)
    ? body.additionalUserIds.filter((id): id is number => typeof id === 'number')
    : []

  const schedService = new ScheduleService(c.get('db') as AppDB)
  const schedule = await schedService.getById(scheduleId)
  if (!schedule) return c.json({ error: 'スケジュールが見つかりません' }, 404)
  if (schedule.status !== ScheduleStatus.CONFIRMED) {
    return c.json({ error: '確定済みのスケジュールのみ通知できます' }, 400)
  }

  const apiKey = readEnv(c, 'RESEND_API_KEY')
  if (!apiKey) return c.json({ error: 'RESEND_API_KEY が設定されていません' }, 500)

  const service = new NotificationService(c.get('db') as AppDB)
  try {
    const result = await service.send(
      scheduleId,
      body.subject,
      body.body,
      payload.sub,
      apiKey,
      NOTIFICATION_FROM,
      additionalUserIds,
    )
    return c.json(result)
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 500)
  }
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
