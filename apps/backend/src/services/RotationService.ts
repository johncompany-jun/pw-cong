import { eq, and, asc } from 'drizzle-orm'
import { db } from '../db'
import { rotationAssignments, schedules, spots, spotPoints, applications, users, specialAssignments } from '../db/schema'
import { sql } from 'drizzle-orm'

export class RotationService {
  async getRotationData(scheduleId: number) {
    // スケジュール + スポット情報
    const [schedule] = await db
      .select({
        id: schedules.id,
        date: schedules.date,
        status: schedules.status,
        slotGranularity: schedules.slotGranularity,
        spot: { id: spots.id, name: spots.name, startTime: spots.startTime, endTime: spots.endTime },
        rotationNotes: schedules.rotationNotes,
        mcUserName: sql<string | null>`(select name from users where users.id = ${schedules.mcUserId})`,
      })
      .from(schedules)
      .innerJoin(spots, eq(schedules.spotId, spots.id))
      .where(eq(schedules.id, scheduleId))

    if (!schedule) return null

    // スポットのポイント一覧
    const points = await db
      .select()
      .from(spotPoints)
      .where(eq(spotPoints.spotId, schedule.spot.id))
      .orderBy(asc(spotPoints.sortOrder))

    // 確定済み参加者（approvedSlots を持つ申込者）
    const participantRows = await db
      .select({
        userId: applications.userId,
        approvedSlots: applications.approvedSlots,
        name: users.name,
      })
      .from(applications)
      .innerJoin(users, eq(applications.userId, users.id))
      .where(and(
        eq(applications.scheduleId, scheduleId),
        sql`${applications.approvedSlots} IS NOT NULL`,
      ))

    const participants = participantRows
      .filter(p => {
        try { return JSON.parse(p.approvedSlots!).length > 0 } catch { return false }
      })
      .map(p => ({
        userId: p.userId,
        name: p.name,
        approvedSlots: JSON.parse(p.approvedSlots!) as string[],
      }))

    // 現在の配置
    const assignmentRows = await db
      .select({
        id: rotationAssignments.id,
        timeSlot: rotationAssignments.timeSlot,
        columnKey: rotationAssignments.columnKey,
        userId: rotationAssignments.userId,
        userName: users.name,
      })
      .from(rotationAssignments)
      .innerJoin(users, eq(rotationAssignments.userId, users.id))
      .where(eq(rotationAssignments.scheduleId, scheduleId))

    // 特別担当
    const specialAssignmentRows = await db
      .select({
        id: specialAssignments.id,
        assignmentType: specialAssignments.assignmentType,
        userId: specialAssignments.userId,
        userName: users.name,
      })
      .from(specialAssignments)
      .innerJoin(users, eq(specialAssignments.userId, users.id))
      .where(eq(specialAssignments.scheduleId, scheduleId))

    return { schedule, points, participants, assignments: assignmentRows, specialAssignments: specialAssignmentRows }
  }

  async upsertCell(scheduleId: number, timeSlot: string, columnKey: string, userId: number | null) {
    if (userId === null) {
      await db
        .delete(rotationAssignments)
        .where(and(
          eq(rotationAssignments.scheduleId, scheduleId),
          eq(rotationAssignments.timeSlot, timeSlot),
          eq(rotationAssignments.columnKey, columnKey),
        ))
      return null
    }

    const existing = await db
      .select()
      .from(rotationAssignments)
      .where(and(
        eq(rotationAssignments.scheduleId, scheduleId),
        eq(rotationAssignments.timeSlot, timeSlot),
        eq(rotationAssignments.columnKey, columnKey),
      ))

    if (existing.length > 0) {
      const [row] = await db
        .update(rotationAssignments)
        .set({ userId })
        .where(eq(rotationAssignments.id, existing[0].id))
        .returning()
      return row
    } else {
      const [row] = await db
        .insert(rotationAssignments)
        .values({ scheduleId, timeSlot, columnKey, userId })
        .returning()
      return row
    }
  }

  async clearSchedule(scheduleId: number) {
    await db.delete(rotationAssignments).where(eq(rotationAssignments.scheduleId, scheduleId))
  }
}
