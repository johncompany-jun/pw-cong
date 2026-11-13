import { eq, desc, asc, and, or, exists, inArray } from 'drizzle-orm'
import type { AppDB } from '../db'
import { permits, permitFiles, spots, spotInvitations } from '../db/schema'
import type { LayoutStorage } from '../storage/types'

const MAX_FILES = 3

export type PermitFileInput = {
  key: string
  name: string
  mimeType: string
  size: number
  body: ArrayBuffer
}

export type PermitInput = {
  spotId: number
  startDate: string
  endDate: string
}

export class PermitService {
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
        id: permits.id,
        spotId: permits.spotId,
        startDate: permits.startDate,
        endDate: permits.endDate,
        uploadedBy: permits.uploadedBy,
        createdAt: permits.createdAt,
        spotName: spots.name,
      })
      .from(permits)
      .innerJoin(spots, eq(permits.spotId, spots.id))
      .where(where)
      .orderBy(desc(permits.startDate), desc(permits.id))

    if (rows.length === 0) return []

    const ids = rows.map(r => r.id)
    const files = await this.db
      .select({
        id: permitFiles.id,
        permitId: permitFiles.permitId,
        fileName: permitFiles.fileName,
        mimeType: permitFiles.mimeType,
        sortOrder: permitFiles.sortOrder,
      })
      .from(permitFiles)
      .where(inArray(permitFiles.permitId, ids))
      .orderBy(asc(permitFiles.sortOrder), asc(permitFiles.id))

    return rows.map(r => {
      const items = files.filter(f => f.permitId === r.id)
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
        id: permits.id,
        spotId: permits.spotId,
        startDate: permits.startDate,
        endDate: permits.endDate,
        uploadedBy: permits.uploadedBy,
        createdAt: permits.createdAt,
        spotName: spots.name,
      })
      .from(permits)
      .innerJoin(spots, eq(permits.spotId, spots.id))
      .where(where ? and(eq(permits.id, id), where) : eq(permits.id, id))

    if (!row) return null

    const files = await this.db
      .select()
      .from(permitFiles)
      .where(eq(permitFiles.permitId, id))
      .orderBy(asc(permitFiles.sortOrder), asc(permitFiles.id))

    return { ...row, files }
  }

  async getFile(permitId: number, fileId: number, viewer: { userId: number; isAdmin: boolean }) {
    const permit = await this.getById(permitId, viewer)
    if (!permit) return null
    const file = permit.files.find(f => f.id === fileId)
    if (!file) return null
    const obj = await this.storage.get(file.fileKey)
    if (!obj) return null
    return { file, object: obj }
  }

  async create(input: PermitInput, files: PermitFileInput[], uploadedBy: number) {
    if (files.length < 1) throw new Error('ファイルを1つ以上添付してください')
    if (files.length > MAX_FILES) throw new Error(`ファイルは最大${MAX_FILES}つまでです`)
    this.validateDates(input.startDate, input.endDate)

    const [spot] = await this.db.select().from(spots).where(eq(spots.id, input.spotId))
    if (!spot) throw new Error('スポットが見つかりません')

    const [row] = await this.db
      .insert(permits)
      .values({
        spotId: input.spotId,
        startDate: input.startDate,
        endDate: input.endDate,
        uploadedBy,
      })
      .returning()

    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      await this.storage.put(f.key, f.body, f.mimeType)
      await this.db.insert(permitFiles).values({
        permitId: row.id,
        fileKey: f.key,
        fileName: f.name,
        mimeType: f.mimeType,
        fileSize: f.size,
        sortOrder: i,
      })
    }

    return this.getById(row.id, { userId: uploadedBy, isAdmin: true })
  }

  async updateMeta(id: number, input: PermitInput) {
    this.validateDates(input.startDate, input.endDate)
    const [row] = await this.db
      .update(permits)
      .set({
        spotId: input.spotId,
        startDate: input.startDate,
        endDate: input.endDate,
      })
      .where(eq(permits.id, id))
      .returning()
    if (!row) throw new Error('許可証が見つかりません')
    return row
  }

  async addFiles(id: number, newFiles: PermitFileInput[]) {
    if (newFiles.length === 0) return
    const current = await this.db
      .select({ id: permitFiles.id, sortOrder: permitFiles.sortOrder })
      .from(permitFiles)
      .where(eq(permitFiles.permitId, id))
    if (current.length + newFiles.length > MAX_FILES) {
      throw new Error(`ファイルは最大${MAX_FILES}つまでです`)
    }
    const start = current.reduce((max, f) => Math.max(max, f.sortOrder), -1) + 1
    for (let i = 0; i < newFiles.length; i++) {
      const f = newFiles[i]
      await this.storage.put(f.key, f.body, f.mimeType)
      await this.db.insert(permitFiles).values({
        permitId: id,
        fileKey: f.key,
        fileName: f.name,
        mimeType: f.mimeType,
        fileSize: f.size,
        sortOrder: start + i,
      })
    }
  }

  async deleteFile(permitId: number, fileId: number) {
    const [file] = await this.db
      .select()
      .from(permitFiles)
      .where(and(eq(permitFiles.id, fileId), eq(permitFiles.permitId, permitId)))
    if (!file) throw new Error('ファイルが見つかりません')

    const siblings = await this.db
      .select({ id: permitFiles.id })
      .from(permitFiles)
      .where(eq(permitFiles.permitId, permitId))
    if (siblings.length <= 1) throw new Error('最低1つのファイルが必要です')

    await this.storage.delete(file.fileKey)
    await this.db.delete(permitFiles).where(eq(permitFiles.id, fileId))
  }

  async delete(id: number) {
    const files = await this.db.select().from(permitFiles).where(eq(permitFiles.permitId, id))
    for (const f of files) {
      await this.storage.delete(f.fileKey)
    }
    await this.db.delete(permitFiles).where(eq(permitFiles.permitId, id))
    await this.db.delete(permits).where(eq(permits.id, id))
  }

  private validateDates(startDate: string, endDate: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      throw new Error('日付は YYYY-MM-DD 形式で指定してください')
    }
    if (startDate > endDate) throw new Error('開始日は終了日以前にしてください')
  }
}
