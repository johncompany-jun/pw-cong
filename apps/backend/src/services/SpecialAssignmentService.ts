import { db } from '../db'
import { specialAssignments, users, applications } from '../db/schema'
import { eq, and } from 'drizzle-orm'

type AssignmentType = 'cart_prepare' | 'cart_cleanup' | 'transport_go' | 'transport_return'

export class SpecialAssignmentService {
  async listBySchedule(scheduleId: number) {
    const rows = await db
      .select({
        id: specialAssignments.id,
        scheduleId: specialAssignments.scheduleId,
        userId: specialAssignments.userId,
        assignmentType: specialAssignments.assignmentType,
        user: { id: users.id, name: users.name },
      })
      .from(specialAssignments)
      .innerJoin(users, eq(specialAssignments.userId, users.id))
      .where(eq(specialAssignments.scheduleId, scheduleId))
    return rows
  }

  // 申込時に「可」と回答した人の候補一覧
  async listCandidates(scheduleId: number, assignmentType: AssignmentType) {
    const column = {
      cart_prepare: applications.cartPrepare,
      cart_cleanup: applications.cartCleanup,
      transport_go: applications.carTransport,
      transport_return: applications.carTransport,
    }[assignmentType]

    const rows = await db
      .select({
        userId: applications.userId,
        name: users.name,
      })
      .from(applications)
      .innerJoin(users, eq(applications.userId, users.id))
      .where(and(eq(applications.scheduleId, scheduleId), eq(column, 'yes')))
    return rows
  }

  async create(scheduleId: number, userId: number, assignmentType: AssignmentType) {
    const [row] = await db
      .insert(specialAssignments)
      .values({ scheduleId, userId, assignmentType })
      .onConflictDoNothing()
      .returning()
    return row
  }

  async delete(id: number) {
    await db.delete(specialAssignments).where(eq(specialAssignments.id, id))
  }

  async deleteByScheduleAndUser(scheduleId: number, userId: number, assignmentType: AssignmentType) {
    await db
      .delete(specialAssignments)
      .where(
        and(
          eq(specialAssignments.scheduleId, scheduleId),
          eq(specialAssignments.userId, userId),
          eq(specialAssignments.assignmentType, assignmentType),
        ),
      )
  }
}
