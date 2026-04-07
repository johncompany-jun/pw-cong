import { Hono } from 'hono'
import { authMiddleware, adminMiddleware } from '../auth'
import { SpecialAssignmentService } from '../services/SpecialAssignmentService'

const service = new SpecialAssignmentService()
export const specialAssignmentRoutes = new Hono()

specialAssignmentRoutes.use('/*', authMiddleware)

// スケジュールの特別担当一覧
specialAssignmentRoutes.get('/:scheduleId', async (c) => {
  const scheduleId = Number(c.req.param('scheduleId'))
  const rows = await service.listBySchedule(scheduleId)
  return c.json(rows)
})

// 候補者一覧（申込時に「可」と回答した人）
specialAssignmentRoutes.get('/:scheduleId/candidates/:type', adminMiddleware, async (c) => {
  const scheduleId = Number(c.req.param('scheduleId'))
  const type = c.req.param('type') as 'cart_prepare' | 'cart_cleanup' | 'transport_go' | 'transport_return'
  const rows = await service.listCandidates(scheduleId, type)
  return c.json(rows)
})

// 特別担当割り当て
specialAssignmentRoutes.post('/', adminMiddleware, async (c) => {
  const { scheduleId, userId, assignmentType } = await c.req.json<{
    scheduleId: number
    userId: number
    assignmentType: 'cart_prepare' | 'cart_cleanup' | 'transport_go' | 'transport_return'
  }>()
  const row = await service.create(scheduleId, userId, assignmentType)
  return c.json(row, 201)
})

// 特別担当解除
specialAssignmentRoutes.delete('/:id', adminMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  await service.delete(id)
  return c.json({ message: '解除しました' })
})
