import { eq, desc, and, sql } from 'drizzle-orm'
import type { AppDB } from '../db'
import { announcements, announcementReads, users } from '../db/schema'

export type AnnouncementInput = {
  title: string
  body: string
}

export class AnnouncementService {
  constructor(private db: AppDB) {}

  async list(viewerUserId: number) {
    const rows = await this.db
      .select({
        id: announcements.id,
        title: announcements.title,
        body: announcements.body,
        createdBy: announcements.createdBy,
        createdByName: users.name,
        createdAt: announcements.createdAt,
        updatedAt: announcements.updatedAt,
        read: sql<number>`EXISTS(
          SELECT 1 FROM announcement_reads
          WHERE announcement_reads.announcement_id = ${announcements.id}
            AND announcement_reads.user_id = ${viewerUserId}
        )`,
      })
      .from(announcements)
      .leftJoin(users, eq(announcements.createdBy, users.id))
      .orderBy(desc(announcements.createdAt), desc(announcements.id))

    return rows.map(r => ({ ...r, read: Boolean(r.read) }))
  }

  async getById(id: number) {
    const [row] = await this.db.select().from(announcements).where(eq(announcements.id, id))
    return row ?? null
  }

  async create(input: AnnouncementInput, createdBy: number) {
    this.validate(input)
    const [row] = await this.db
      .insert(announcements)
      .values({
        title: input.title,
        body: input.body,
        createdBy,
      })
      .returning()
    return row
  }

  async update(id: number, input: AnnouncementInput) {
    this.validate(input)
    const [row] = await this.db
      .update(announcements)
      .set({
        title: input.title,
        body: input.body,
        updatedAt: sql`(datetime('now'))`,
      })
      .where(eq(announcements.id, id))
      .returning()
    if (!row) throw new Error('お知らせが見つかりません')
    // 再アナウンス: 既読を全消去して全員に未読として再表示
    await this.db.delete(announcementReads).where(eq(announcementReads.announcementId, id))
    return row
  }

  async delete(id: number) {
    await this.db.delete(announcementReads).where(eq(announcementReads.announcementId, id))
    await this.db.delete(announcements).where(eq(announcements.id, id))
  }

  async markRead(id: number, userId: number) {
    const [existing] = await this.db
      .select({ id: announcementReads.id })
      .from(announcementReads)
      .where(and(eq(announcementReads.announcementId, id), eq(announcementReads.userId, userId)))
    if (existing) return
    await this.db.insert(announcementReads).values({ announcementId: id, userId })
  }

  async unmarkRead(id: number, userId: number) {
    await this.db
      .delete(announcementReads)
      .where(and(eq(announcementReads.announcementId, id), eq(announcementReads.userId, userId)))
  }

  private validate(input: AnnouncementInput) {
    const title = input.title?.trim() ?? ''
    const body = input.body?.trim() ?? ''
    if (!title) throw new Error('タイトルは必須です')
    if (title.length > 200) throw new Error('タイトルが長すぎます（200文字以内）')
    if (!body) throw new Error('本文は必須です')
    if (body.length > 5000) throw new Error('本文が長すぎます（5000文字以内）')
  }
}
