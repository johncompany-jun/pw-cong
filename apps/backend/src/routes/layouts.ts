import { Hono } from 'hono'
import { LayoutService, type LayoutFileInput, type LayoutInput } from '../services/LayoutService'
import { authMiddleware, adminMiddleware, type JwtPayload } from '../auth'
import type { AppDB } from '../db'
import type { LayoutStorage } from '../storage/types'
import type { Variables } from '../types'

export const layoutRoutes = new Hono<{ Variables: Variables }>()

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_FILES = 3
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

function extForMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg': return 'jpg'
    case 'image/png': return 'png'
    case 'image/webp': return 'webp'
    case 'application/pdf': return 'pdf'
    default: return 'bin'
  }
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function service(c: { get: (k: string) => unknown }): LayoutService {
  return new LayoutService(c.get('db') as AppDB, c.get('storage') as LayoutStorage)
}

async function readFileInputs(form: FormData, layoutId: number | 'pending'): Promise<LayoutFileInput[]> {
  const entries = form.getAll('files').filter((v): v is File => v instanceof File)
  const out: LayoutFileInput[] = []
  for (const file of entries) {
    if (!ALLOWED_MIME.has(file.type)) {
      throw new Error(`許可されていないファイル形式です: ${file.type || '不明'}`)
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`ファイルサイズは${MAX_FILE_SIZE / 1024 / 1024}MB以下にしてください: ${file.name}`)
    }
    const ab = await file.arrayBuffer()
    const key = `layouts/${layoutId}/${uuid()}.${extForMime(file.type)}`
    out.push({
      key,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      body: ab,
    })
  }
  return out
}

function parseMeta(form: FormData): LayoutInput {
  const spotId = Number(form.get('spotId'))
  const title = String(form.get('title') ?? '').trim()
  const comment = form.get('comment') != null ? String(form.get('comment')).trim() : null
  const startDate = String(form.get('startDate') ?? '').trim()
  const endDate = String(form.get('endDate') ?? '').trim()
  if (!spotId || !title || !startDate || !endDate) {
    throw new Error('スポット・タイトル・表示開始日・表示終了日は必須です')
  }
  if (title.length > 200) throw new Error('タイトルが長すぎます（200文字以内）')
  if (comment && comment.length > 1000) throw new Error('コメントが長すぎます（1000文字以内）')
  return { spotId, title, comment, startDate, endDate }
}

layoutRoutes.use('/*', authMiddleware)

layoutRoutes.get('/', async (c) => {
  const payload = c.get('jwtPayload') as JwtPayload
  const list = await service(c).list({ userId: payload.sub, isAdmin: payload.isAdmin })
  return c.json(list)
})

layoutRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const payload = c.get('jwtPayload') as JwtPayload
  const row = await service(c).getById(id, { userId: payload.sub, isAdmin: payload.isAdmin })
  if (!row) return c.json({ error: 'レイアウトが見つかりません' }, 404)
  return c.json(row)
})

layoutRoutes.get('/:id/files/:fileId', async (c) => {
  const id = Number(c.req.param('id'))
  const fileId = Number(c.req.param('fileId'))
  const payload = c.get('jwtPayload') as JwtPayload
  const result = await service(c).getFile(id, fileId, { userId: payload.sub, isAdmin: payload.isAdmin })
  if (!result) return c.json({ error: 'ファイルが見つかりません' }, 404)
  const { file, object } = result
  c.header('Content-Type', file.mimeType || object.contentType)
  c.header('Content-Length', String(object.contentLength))
  c.header('Cache-Control', 'private, max-age=60')
  c.header('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`)
  return c.body(object.body)
})

layoutRoutes.post('/', adminMiddleware, async (c) => {
  const payload = c.get('jwtPayload') as JwtPayload
  try {
    const form = await c.req.formData()
    const meta = parseMeta(form)
    const files = await readFileInputs(form, 'pending')
    if (files.length === 0) return c.json({ error: 'ファイルを1つ以上添付してください' }, 400)
    if (files.length > MAX_FILES) return c.json({ error: `ファイルは最大${MAX_FILES}つまでです` }, 400)

    const row = await service(c).create(meta, files, payload.sub)
    return c.json(row, 201)
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

layoutRoutes.put('/:id', adminMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  try {
    const form = await c.req.formData()
    const meta = parseMeta(form)
    const svc = service(c)
    await svc.updateMeta(id, meta)
    const newFiles = await readFileInputs(form, id)
    if (newFiles.length > 0) await svc.addFiles(id, newFiles)
    const payload = c.get('jwtPayload') as JwtPayload
    const row = await svc.getById(id, { userId: payload.sub, isAdmin: payload.isAdmin })
    return c.json(row)
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

layoutRoutes.delete('/:id/files/:fileId', adminMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  const fileId = Number(c.req.param('fileId'))
  try {
    await service(c).deleteFile(id, fileId)
    return c.json({ message: '削除しました' })
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})

layoutRoutes.delete('/:id', adminMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  try {
    await service(c).delete(id)
    return c.json({ message: '削除しました' })
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, 400)
  }
})
