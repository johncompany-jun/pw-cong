import { Hono } from 'hono'
import { authMiddleware, type JwtPayload } from '../auth'
import { SpecialAssignmentService } from '../services/SpecialAssignmentService'
import { ScheduleService } from '../services/ScheduleService'
import type { AppDB } from '../db'
import type { Variables } from '../types'

async function requireAdminOrScheduleMc(c: Parameters<typeof authMiddleware>[0], scheduleId: number): Promise<boolean> {
  const payload = c.get('jwtPayload') as JwtPayload
  if (payload.isAdmin) return true
  const schedule = await new ScheduleService(c.get('db') as AppDB).getById(scheduleId)
  return schedule?.mcUserId === payload.sub
}

export const specialAssignmentRoutes = new Hono<{ Variables: Variables }>()

specialAssignmentRoutes.use('/*', authMiddleware)

// スケジュールの特別担当一覧
specialAssignmentRoutes.get('/:scheduleId', async (c) => {
  const scheduleId = Number(c.req.param('scheduleId'))
  const service = new SpecialAssignmentService(c.get('db') as AppDB)
  const rows = await service.listBySchedule(scheduleId)
  return c.json(rows)
})

// 候補者一覧（申込時に「可」と回答した人）
specialAssignmentRoutes.get('/:scheduleId/candidates/:type', async (c) => {
  const scheduleId = Number(c.req.param('scheduleId'))
  if (!await requireAdminOrScheduleMc(c, scheduleId)) {
    return c.json({ error: '権限がありません' }, 403)
  }
  const type = c.req.param('type') as 'cart_prepare' | 'cart_cleanup' | 'transport_go' | 'transport_return'
  const service = new SpecialAssignmentService(c.get('db') as AppDB)
  const rows = await service.listCandidates(scheduleId, type)
  return c.json(rows)
})

// カート運搬割り当て
specialAssignmentRoutes.post('/', async (c) => {
  const { scheduleId, userId, assignmentType } = await c.req.json<{
    scheduleId: number
    userId: number
    assignmentType: 'cart_prepare' | 'cart_cleanup' | 'transport_go' | 'transport_return'
  }>()
  if (!await requireAdminOrScheduleMc(c, scheduleId)) {
    return c.json({ error: '権限がありません' }, 403)
  }
  const service = new SpecialAssignmentService(c.get('db') as AppDB)
  const row = await service.create(scheduleId, userId, assignmentType)
  return c.json(row, 201)
})

// カート運搬解除
specialAssignmentRoutes.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const service = new SpecialAssignmentService(c.get('db') as AppDB)
  const scheduleId = await service.getScheduleId(id)
  if (!scheduleId || !await requireAdminOrScheduleMc(c, scheduleId)) {
    return c.json({ error: '権限がありません' }, 403)
  }
  await service.delete(id)
  return c.json({ message: '解除しました' })
})
