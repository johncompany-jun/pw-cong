import { Hono } from 'hono'
import { SpotService } from '../services/SpotService'
import { authMiddleware, adminMiddleware } from '../auth'
import type { AppDB } from '../db'
import type { Variables } from '../types'

export const spotRoutes = new Hono<{ Variables: Variables }>()

spotRoutes.use('/*', authMiddleware)

spotRoutes.get('/', async (c) => {
  const service = new SpotService(c.get('db') as AppDB)
  const list = await service.list()
  return c.json(list)
})

spotRoutes.post('/', adminMiddleware, async (c) => {
  const body = await c.req.json()
  if (!body.name || !body.startTime || !body.endTime) {
    return c.json({ error: '名前・開始時間・終了時間は必須です' }, 400)
  }
  try {
    const service = new SpotService(c.get('db') as AppDB)
    const spot = await service.create(body)
    return c.json(spot, 201)
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

spotRoutes.put('/:id', adminMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  try {
    const service = new SpotService(c.get('db') as AppDB)
    const spot = await service.update(id, body)
    return c.json(spot)
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

spotRoutes.delete('/:id', adminMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  const service = new SpotService(c.get('db') as AppDB)
  await service.delete(id)
  return c.json({ message: '削除しました' })
})
