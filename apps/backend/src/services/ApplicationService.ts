import { db } from '../db'
import { applications, users, schedules, spots } from '../db/schema'
import { eq, and } from 'drizzle-orm'

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
  async listByUser(userId: number) {
    const rows = await db
      .select()
      .from(applications)
      .where(eq(applications.userId, userId))
    return rows
  }

  async listMySchedules(userId: number) {
    const rows = await db
      .select({
        id: schedules.id,
        date: schedules.date,
        status: schedules.status,
        spot: { id: spots.id, name: spots.name, startTime: spots.startTime, endTime: spots.endTime },
        selectedSlots: applications.selectedSlots,
      })
      .from(applications)
      .innerJoin(schedules, eq(applications.scheduleId, schedules.id))
      .innerJoin(spots, eq(schedules.spotId, spots.id))
      .where(eq(applications.userId, userId))
      .orderBy(schedules.date)
    return rows
  }

  async listMyConfirmedSchedules(userId: number) {
    const rows = await db
      .select({
        id: schedules.id,
        date: schedules.date,
        status: schedules.status,
        spot: { id: spots.id, name: spots.name, startTime: spots.startTime, endTime: spots.endTime },
      })
      .from(applications)
      .innerJoin(schedules, eq(applications.scheduleId, schedules.id))
      .innerJoin(spots, eq(schedules.spotId, spots.id))
      .where(and(eq(applications.userId, userId), eq(schedules.status, 'confirmed')))
      .orderBy(schedules.date)
    return rows
  }

  async listBySchedule(scheduleId: number) {
    const rows = await db
      .select()
      .from(applications)
      .where(eq(applications.scheduleId, scheduleId))
    return rows
  }

  async listByScheduleWithUsers(scheduleId: number) {
    const rows = await db
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
    const [updated] = await db
      .update(applications)
      .set({ participationStatus: status, updatedAt: new Date().toISOString() })
      .where(eq(applications.id, id))
      .returning()
    if (!updated) throw new Error('申込が見つかりません')
    return updated
  }

  async updateApprovedSlots(id: number, approvedSlots: string[]) {
    const [updated] = await db
      .update(applications)
      .set({ approvedSlots: JSON.stringify(approvedSlots), updatedAt: new Date().toISOString() })
      .where(eq(applications.id, id))
      .returning()
    if (!updated) throw new Error('申込が見つかりません')
    return updated
  }

  async create(input: CreateInput) {
    const existing = await db
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

    const [app] = await db
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
    const [existing] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    if (!existing) throw new Error('申込が見つかりません')
    await db.delete(applications).where(eq(applications.id, id))
  }
}
