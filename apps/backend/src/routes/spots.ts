import { Hono } from 'hono'
import { SpotService } from '../services/SpotService'
import { authMiddleware, adminMiddleware } from '../auth'

const spotService = new SpotService()
export const spotRoutes = new Hono()

spotRoutes.use('/*', authMiddleware)

spotRoutes.get('/', async (c) => {
  const list = await spotService.list()
  return c.json(list)
})

spotRoutes.post('/', adminMiddleware, async (c) => {
  const body = await c.req.json()
  if (!body.name || !body.startTime || !body.endTime) {
    return c.json({ error: '名前・開始時間・終了時間は必須です' }, 400)
  }
  try {
    const spot = await spotService.create(body)
    return c.json(spot, 201)
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

spotRoutes.put('/:id', adminMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  try {
    const spot = await spotService.update(id, body)
    return c.json(spot)
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

spotRoutes.delete('/:id', adminMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  await spotService.delete(id)
  return c.json({ message: '削除しました' })
})
