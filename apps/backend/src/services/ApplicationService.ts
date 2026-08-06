import type { AppDB } from '../db'
import { applications, users, schedules, spots, rotationAssignments, spotInvitations } from '../db/schema'
import { eq, and, inArray, desc, sql } from 'drizzle-orm'

type YesNo = 'yes' | 'no'

type CreateInput = {
  scheduleId: number
  userId: number
  selectedSlots: string[]
  cartPrepare: YesNo
  cartCleanup: YesNo
  carTransport: YesNo
  notes?: string | null
}

export class ApplicationService {
  constructor(private db: AppDB) {}

  async listByUser(userId: number) {
    const rows = await this.db
      .select()
      .from(applications)
      .where(eq(applications.userId, userId))
    return rows
  }

  async listMySchedules(userId: number) {
    const spotFields = { id: spots.id, name: spots.name, startTime: spots.startTime, endTime: spots.endTime, visibility: spots.visibility }

    // 申し込み済みスケジュール
    const applied = await this.db
      .select({ id: schedules.id, date: schedules.date, status: schedules.status, spot: spotFields, selectedSlots: applications.selectedSlots })
      .from(applications)
      .innerJoin(schedules, eq(applications.scheduleId, schedules.id))
      .innerJoin(spots, eq(schedules.spotId, spots.id))
      .where(eq(applications.userId, userId))

    // MC担当スケジュール（申し込み済みと重複しないもの）
    const appliedIds = new Set(applied.map(r => r.id))
    const mcRows = await this.db
      .select({ id: schedules.id, date: schedules.date, status: schedules.status, spot: spotFields })
      .from(schedules)
      .innerJoin(spots, eq(schedules.spotId, spots.id))
      .where(eq(schedules.mcUserId, userId))
    const mcOnly = mcRows
      .filter(s => !appliedIds.has(s.id))
      .map(s => ({ ...s, selectedSlots: null as string | null }))

    const all = [...applied, ...mcOnly]
    if (all.length === 0) return []

    // ローテーション作成済みかチェック
    const allIds = all.map(r => r.id)
    const rotated = await this.db
      .selectDistinct({ scheduleId: rotationAssignments.scheduleId })
      .from(rotationAssignments)
      .where(inArray(rotationAssignments.scheduleId, allIds))
    const rotatedIds = new Set(rotated.map(r => r.scheduleId))

    return all
      .map(r => ({ ...r, isMc: !appliedIds.has(r.id), hasRotation: rotatedIds.has(r.id) }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  async listMyConfirmedSchedules(userId: number, page: number, limit: number) {
    const offset = (page - 1) * limit
    const where = and(eq(applications.userId, userId), eq(schedules.status, 'confirmed'))

    const data = await this.db
      .select({
        id: schedules.id,
        date: schedules.date,
        status: schedules.status,
        spot: { id: spots.id, name: spots.name, startTime: spots.startTime, endTime: spots.endTime, visibility: spots.visibility },
      })
      .from(applications)
      .innerJoin(schedules, eq(applications.scheduleId, schedules.id))
      .innerJoin(spots, eq(schedules.spotId, spots.id))
      .where(where)
      .orderBy(desc(schedules.date))
      .limit(limit)
      .offset(offset)

    const [{ total }] = await this.db
      .select({ total: sql<number>`count(*)` })
      .from(applications)
      .innerJoin(schedules, eq(applications.scheduleId, schedules.id))
      .where(where)

    return {
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }
  }

  async getScheduleIdByApplicationId(id: number) {
    const [row] = await this.db
      .select({ scheduleId: applications.scheduleId })
      .from(applications)
      .where(eq(applications.id, id))
    return row ?? null
  }

  async listBySchedule(scheduleId: number) {
    const rows = await this.db
      .select()
      .from(applications)
      .where(eq(applications.scheduleId, scheduleId))
    return rows
  }

  async listByScheduleWithUsers(scheduleId: number) {
    const rows = await this.db
      .select({
        id: applications.id,
        scheduleId: applications.scheduleId,
        userId: applications.userId,
        selectedSlots: applications.selectedSlots,
        approvedSlots: applications.approvedSlots,
        cartPrepare: applications.cartPrepare,
        cartCleanup: applications.cartCleanup,
        carTransport: applications.carTransport,
        notes: applications.notes,
        participationStatus: applications.participationStatus,
        createdAt: applications.createdAt,
        user: { id: users.id, name: users.name, email: users.email },
      })
      .from(applications)
      .innerJoin(users, eq(applications.userId, users.id))
      .where(eq(applications.scheduleId, scheduleId))
      .orderBy(applications.createdAt)
    return rows
  }

  async updateParticipationStatus(id: number, status: 'pending' | 'approved' | 'rejected') {
    const [updated] = await this.db
      .update(applications)
      .set({ participationStatus: status, updatedAt: new Date().toISOString() })
      .where(eq(applications.id, id))
      .returning()
    if (!updated) throw new Error('申込が見つかりません')
    return updated
  }

  async updateApprovedSlots(id: number, approvedSlots: string[]) {
    const [updated] = await this.db
      .update(applications)
      .set({ approvedSlots: JSON.stringify(approvedSlots), updatedAt: new Date().toISOString() })
      .where(eq(applications.id, id))
      .returning()
    if (!updated) throw new Error('申込が見つかりません')
    return updated
  }

  async create(input: CreateInput) {
    const [target] = await this.db
      .select({ spotId: schedules.spotId, visibility: spots.visibility })
      .from(schedules)
      .innerJoin(spots, eq(schedules.spotId, spots.id))
      .where(eq(schedules.id, input.scheduleId))
    if (!target) throw new Error('スケジュールが見つかりません')

    if (target.visibility === 'private') {
      const [inv] = await this.db
        .select({ id: spotInvitations.id })
        .from(spotInvitations)
        .where(and(eq(spotInvitations.spotId, target.spotId), eq(spotInvitations.userId, input.userId)))
      if (!inv) throw new Error('このスポットへの招待がありません')
    }

    const existing = await this.db
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(
          eq(applications.scheduleId, input.scheduleId),
          eq(applications.userId, input.userId),
        ),
      )
    if (existing.length > 0) {
      throw new Error('すでにこのスケジュールへの申込が存在します')
    }

    const [app] = await this.db
      .insert(applications)
      .values({
        scheduleId: input.scheduleId,
        userId: input.userId,
        selectedSlots: JSON.stringify(input.selectedSlots),
        cartPrepare: input.cartPrepare,
        cartCleanup: input.cartCleanup,
        carTransport: input.carTransport,
        notes: input.notes ?? null,
      })
      .returning()
    return app
  }

  async delete(id: number, userId: number) {
    const [existing] = await this.db
      .select({ id: applications.id })
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    if (!existing) throw new Error('申込が見つかりません')
    await this.db.delete(applications).where(eq(applications.id, id))
  }
}
