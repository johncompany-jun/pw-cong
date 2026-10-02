import { eq, desc, asc, and, or, exists, inArray } from 'drizzle-orm'
import type { AppDB } from '../db'
import { layouts, layoutFiles, spots, spotInvitations } from '../db/schema'
import type { LayoutStorage } from '../storage/types'

const MAX_FILES = 3

export type LayoutFileInput = {
  key: string
  name: string
  mimeType: string
  size: number
  body: ArrayBuffer
}

export type LayoutInput = {
  spotId: number
  title: string
  comment?: string | null
  startDate: string
  endDate: string
}

export class LayoutService {
  constructor(private db: AppDB, private storage: LayoutStorage) {}

  private visibilityWhere(userId: number, isAdmin: boolean) {
    if (isAdmin) return undefined
    return or(
      eq(spots.visibility, 'public'),
      exists(
        this.db
          .select({ id: spotInvitations.id })
          .from(spotInvitations)
          .where(and(eq(spotInvitations.spotId, spots.id), eq(spotInvitations.userId, userId))),
      ),
    )
  }

  async list(viewer: { userId: number; isAdmin: boolean }) {
    const where = this.visibilityWhere(viewer.userId, viewer.isAdmin)

    const rows = await this.db
      .select({
        id: layouts.id,
        spotId: layouts.spotId,
        title: layouts.title,
        comment: layouts.comment,
        startDate: layouts.startDate,
        endDate: layouts.endDate,
        uploadedBy: layouts.uploadedBy,
        createdAt: layouts.createdAt,
        spotName: spots.name,
      })
      .from(layouts)
      .innerJoin(spots, eq(layouts.spotId, spots.id))
      .where(where)
      .orderBy(desc(layouts.startDate), desc(layouts.id))

    if (rows.length === 0) return []

    const ids = rows.map(r => r.id)
    const files = await this.db
      .select({
        id: layoutFiles.id,
        layoutId: layoutFiles.layoutId,
        fileName: layoutFiles.fileName,
        mimeType: layoutFiles.mimeType,
        sortOrder: layoutFiles.sortOrder,
      })
      .from(layoutFiles)
      .where(inArray(layoutFiles.layoutId, ids))
      .orderBy(asc(layoutFiles.sortOrder), asc(layoutFiles.id))

    return rows.map(r => {
      const items = files.filter(f => f.layoutId === r.id)
      return {
        ...r,
        fileCount: items.length,
        firstFile: items[0] ?? null,
      }
    })
  }

  async getById(id: number, viewer: { userId: number; isAdmin: boolean }) {
    const where = this.visibilityWhere(viewer.userId, viewer.isAdmin)
    const [row] = await this.db
      .select({
        id: layouts.id,
        spotId: layouts.spotId,
        title: layouts.title,
        comment: layouts.comment,
        startDate: layouts.startDate,
        endDate: layouts.endDate,
        uploadedBy: layouts.uploadedBy,
        createdAt: layouts.createdAt,
        spotName: spots.name,
      })
      .from(layouts)
      .innerJoin(spots, eq(layouts.spotId, spots.id))
      .where(where ? and(eq(layouts.id, id), where) : eq(layouts.id, id))

    if (!row) return null

    const files = await this.db
      .select()
      .from(layoutFiles)
      .where(eq(layoutFiles.layoutId, id))
      .orderBy(asc(layoutFiles.sortOrder), asc(layoutFiles.id))

    return { ...row, files }
  }

  async getFile(layoutId: number, fileId: number, viewer: { userId: number; isAdmin: boolean }) {
    const layout = await this.getById(layoutId, viewer)
    if (!layout) return null
    const file = layout.files.find(f => f.id === fileId)
    if (!file) return null
    const obj = await this.storage.get(file.fileKey)
    if (!obj) return null
    return { file, object: obj }
  }

  async create(input: LayoutInput, files: LayoutFileInput[], uploadedBy: number) {
    if (files.length < 1) throw new Error('ファイルを1つ以上添付してください')
    if (files.length > MAX_FILES) throw new Error(`ファイルは最大${MAX_FILES}つまでです`)
    this.validateDates(input.startDate, input.endDate)

    const [spot] = await this.db.select().from(spots).where(eq(spots.id, input.spotId))
    if (!spot) throw new Error('スポットが見つかりません')

    const [row] = await this.db
      .insert(layouts)
      .values({
        spotId: input.spotId,
        title: input.title,
        comment: input.comment ?? null,
        startDate: input.startDate,
        endDate: input.endDate,
        uploadedBy,
      })
      .returning()

    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      await this.storage.put(f.key, f.body, f.mimeType)
      await this.db.insert(layoutFiles).values({
        layoutId: row.id,
        fileKey: f.key,
        fileName: f.name,
        mimeType: f.mimeType,
        fileSize: f.size,
        sortOrder: i,
      })
    }

    return this.getById(row.id, { userId: uploadedBy, isAdmin: true })
  }

  async updateMeta(id: number, input: LayoutInput) {
    this.validateDates(input.startDate, input.endDate)
    const [row] = await this.db
      .update(layouts)
      .set({
        spotId: input.spotId,
        title: input.title,
        comment: input.comment ?? null,
        startDate: input.startDate,
        endDate: input.endDate,
      })
      .where(eq(layouts.id, id))
      .returning()
    if (!row) throw new Error('レイアウトが見つかりません')
    return row
  }

  async addFiles(id: number, newFiles: LayoutFileInput[]) {
    if (newFiles.length === 0) return
    const current = await this.db
      .select({ id: layoutFiles.id, sortOrder: layoutFiles.sortOrder })
      .from(layoutFiles)
      .where(eq(layoutFiles.layoutId, id))
    if (current.length + newFiles.length > MAX_FILES) {
      throw new Error(`ファイルは最大${MAX_FILES}つまでです`)
    }
    const start = current.reduce((max, f) => Math.max(max, f.sortOrder), -1) + 1
    for (let i = 0; i < newFiles.length; i++) {
      const f = newFiles[i]
      await this.storage.put(f.key, f.body, f.mimeType)
      await this.db.insert(layoutFiles).values({
        layoutId: id,
        fileKey: f.key,
        fileName: f.name,
        mimeType: f.mimeType,
        fileSize: f.size,
        sortOrder: start + i,
      })
    }
  }

  async deleteFile(layoutId: number, fileId: number) {
    const [file] = await this.db
      .select()
      .from(layoutFiles)
      .where(and(eq(layoutFiles.id, fileId), eq(layoutFiles.layoutId, layoutId)))
    if (!file) throw new Error('ファイルが見つかりません')

    const siblings = await this.db
      .select({ id: layoutFiles.id })
      .from(layoutFiles)
      .where(eq(layoutFiles.layoutId, layoutId))
    if (siblings.length <= 1) throw new Error('最低1つのファイルが必要です')

    await this.storage.delete(file.fileKey)
    await this.db.delete(layoutFiles).where(eq(layoutFiles.id, fileId))
  }

  async delete(id: number) {
    const files = await this.db.select().from(layoutFiles).where(eq(layoutFiles.layoutId, id))
    for (const f of files) {
      await this.storage.delete(f.fileKey)
    }
    await this.db.delete(layoutFiles).where(eq(layoutFiles.layoutId, id))
    await this.db.delete(layouts).where(eq(layouts.id, id))
  }

  private validateDates(startDate: string, endDate: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      throw new Error('日付は YYYY-MM-DD 形式で指定してください')
    }
    if (startDate > endDate) throw new Error('開始日は終了日以前にしてください')
  }
}
