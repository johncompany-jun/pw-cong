import { Hono } from 'hono'
import { AnnouncementService } from '../services/AnnouncementService'
import { authMiddleware, adminMiddleware, type JwtPayload } from '../auth'
import type { AppDB } from '../db'
import type { Variables } from '../types'

export const announcementRoutes = new Hono<{ Variables: Variables }>()

function service(c: { get: (k: string) => unknown }): AnnouncementService {
  return new AnnouncementService(c.get('db') as AppDB)
}

announcementRoutes.use('/*', authMiddleware)

announcementRoutes.get('/', async (c) => {
  const payload = c.get('jwtPayload') as JwtPayload
  const list = await service(c).list(payload.sub)
  return c.json(list)
})

announcementRoutes.post('/', adminMiddleware, async (c) => {
  const payload = c.get('jwtPayload') as JwtPayload
  try {
    const body = await c.req.json()
    const row = await service(c).create(
      { title: String(body.title ?? '').trim(), body: String(body.body ?? '').trim() },
      payload.sub,
    )
    return c.json(row, 201)
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

announcementRoutes.put('/:id', adminMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  try {
    const body = await c.req.json()
    const row = await service(c).update(id, {
      title: String(body.title ?? '').trim(),
      body: String(body.body ?? '').trim(),
    })
    return c.json(row)
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

announcementRoutes.delete('/:id', adminMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  try {
    await service(c).delete(id)
    return c.json({ message: '削除しました' })
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

announcementRoutes.post('/:id/read', async (c) => {
  const payload = c.get('jwtPayload') as JwtPayload
  const id = Number(c.req.param('id'))
  try {
    await service(c).markRead(id, payload.sub)
    return c.json({ message: '既読にしました' })
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

announcementRoutes.delete('/:id/read', async (c) => {
  const payload = c.get('jwtPayload') as JwtPayload
  const id = Number(c.req.param('id'))
  try {
    await service(c).unmarkRead(id, payload.sub)
    return c.json({ message: '未読に戻しました' })
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})
