import { Hono } from 'hono'
import { authMiddleware, adminMiddleware, type JwtPayload } from '../auth'
import { ApplicationService } from '../services/ApplicationService'
import type { AppDB } from '../db'
import type { Variables } from '../types'

export const applicationRoutes = new Hono<{ Variables: Variables }>()

applicationRoutes.use('/*', authMiddleware)

// 自分の申込一覧
applicationRoutes.get('/', async (c) => {
  const payload = c.get('jwtPayload') as JwtPayload
  const service = new ApplicationService(c.get('db') as AppDB)
  const apps = await service.listByUser(payload.sub)
  return c.json(apps)
})

// 申込作成
applicationRoutes.post('/', async (c) => {
  const payload = c.get('jwtPayload') as JwtPayload
  const body = await c.req.json<{
    scheduleId: number
    selectedSlots: string[]
    cartPrepare: 'yes' | 'no'
    cartCleanup: 'yes' | 'no'
    carTransport: 'yes' | 'no'
    notes?: string | null
  }>()

  if (!body.scheduleId || !Array.isArray(body.selectedSlots) || body.selectedSlots.length === 0) {
    return c.json({ error: 'スケジュールと時間帯の選択は必須です' }, 400)
  }

  try {
    const service = new ApplicationService(c.get('db') as AppDB)
    const app = await service.create({ ...body, userId: payload.sub })
    return c.json(app, 201)
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

// 自分が申し込んだ全スケジュール一覧（open + confirmed）
applicationRoutes.get('/my-schedules', async (c) => {
  const payload = c.get('jwtPayload') as JwtPayload
  const service = new ApplicationService(c.get('db') as AppDB)
  const rows = await service.listMySchedules(payload.sub)
  return c.json(rows)
})

// 自分が申し込んだ確定済みスケジュール一覧
applicationRoutes.get('/my-confirmed-schedules', async (c) => {
  const payload = c.get('jwtPayload') as JwtPayload
  const service = new ApplicationService(c.get('db') as AppDB)
  const rows = await service.listMyConfirmedSchedules(payload.sub)
  return c.json(rows)
})

// スケジュールの申込一覧（管理者向け・ユーザー情報付き）
applicationRoutes.get('/by-schedule/:scheduleId', adminMiddleware, async (c) => {
  const scheduleId = Number(c.req.param('scheduleId'))
  const service = new ApplicationService(c.get('db') as AppDB)
  const rows = await service.listByScheduleWithUsers(scheduleId)
  return c.json(rows)
})

// 参加ステータス更新（管理者向け）
applicationRoutes.put('/:id/participation', adminMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  const { status } = await c.req.json<{ status: 'pending' | 'approved' | 'rejected' }>()
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return c.json({ error: '無効なステータスです' }, 400)
  }
  try {
    const service = new ApplicationService(c.get('db') as AppDB)
    const updated = await service.updateParticipationStatus(id, status)
    return c.json(updated)
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

// 確定枠更新（管理者向け）
applicationRoutes.put('/:id/approved-slots', adminMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  const { approvedSlots } = await c.req.json<{ approvedSlots: string[] }>()
  if (!Array.isArray(approvedSlots)) {
    return c.json({ error: '無効なデータです' }, 400)
  }
  try {
    const service = new ApplicationService(c.get('db') as AppDB)
    const updated = await service.updateApprovedSlots(id, approvedSlots)
    return c.json(updated)
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

// 申込取消
applicationRoutes.delete('/:id', async (c) => {
  const payload = c.get('jwtPayload') as JwtPayload
  const id = Number(c.req.param('id'))
  try {
    const service = new ApplicationService(c.get('db') as AppDB)
    await service.delete(id, payload.sub)
    return c.json({ message: '取消しました' })
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})
