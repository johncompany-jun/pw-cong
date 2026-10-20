import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import type { AppDB } from '../db'
import {
  rotationAssignments,
  rotationNotifications,
  schedules,
  spotPoints,
  spots,
  users,
} from '../db/schema'

export type NotifyAssignment = { timeSlot: string; location: string }
export type NotifyRecipient = {
  userId: number
  name: string
  email: string
  assignments: NotifyAssignment[]
}
export type NotifyAdmin = {
  userId: number
  name: string
  email: string
  alreadyAssigned: boolean
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function formatDateJP(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${y}年${m}月${d}日(${WEEKDAYS[dt.getDay()]})`
}

function formatColumnKey(key: string, pointMap: Map<number, string>): string {
  const point = key.match(/^point-(\d+)-(1|2)$/)
  if (point) {
    const name = pointMap.get(Number(point[1])) ?? '?'
    return `${name}${point[2] === '1' ? '①' : '②'}`
  }
  const mi = key.match(/^mimaori-(\d+)$/)
  if (mi) {
    const name = pointMap.get(Number(mi[1])) ?? '?'
    return `${name}（見守り）`
  }
  return key
}

export class NotificationService {
  constructor(private db: AppDB) {}

  private async loadContext(scheduleId: number) {
    const [schedule] = await this.db
      .select({
        id: schedules.id,
        date: schedules.date,
        status: schedules.status,
        spotId: schedules.spotId,
        spotName: spots.name,
        mcUserName: sql<string | null>`(select name from users where users.id = ${schedules.mcUserId})`,
      })
      .from(schedules)
      .innerJoin(spots, eq(schedules.spotId, spots.id))
      .where(eq(schedules.id, scheduleId))

    if (!schedule) return null

    const points = await this.db
      .select({ id: spotPoints.id, name: spotPoints.name })
      .from(spotPoints)
      .where(eq(spotPoints.spotId, schedule.spotId))

    const pointMap = new Map(points.map(p => [p.id, p.name]))

    const rows = await this.db
      .select({
        userId: rotationAssignments.userId,
        timeSlot: rotationAssignments.timeSlot,
        columnKey: rotationAssignments.columnKey,
        name: users.name,
        email: users.email,
      })
      .from(rotationAssignments)
      .innerJoin(users, eq(rotationAssignments.userId, users.id))
      .where(eq(rotationAssignments.scheduleId, scheduleId))

    const map = new Map<number, NotifyRecipient>()
    for (const r of rows) {
      if (!map.has(r.userId)) {
        map.set(r.userId, { userId: r.userId, name: r.name, email: r.email, assignments: [] })
      }
      map.get(r.userId)!.assignments.push({
        timeSlot: r.timeSlot,
        location: formatColumnKey(r.columnKey, pointMap),
      })
    }

    for (const rec of map.values()) {
      rec.assignments.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
    }

    const recipients = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ja'))

    return { schedule, recipients }
  }

  async getDraft(scheduleId: number, frontendUrl: string) {
    const ctx = await this.loadContext(scheduleId)
    if (!ctx) return null
    const { schedule, recipients } = ctx

    const dateStr = formatDateJP(schedule.date)
    const url = `${frontendUrl}/my-rotation/${scheduleId}`
    const mc = schedule.mcUserName ?? '司会者'

    const subject = `【御所会衆PW】${dateStr} ${schedule.spotName} ローテーション確定のお知らせ`
    const body =
      `${dateStr}の${schedule.spotName}のPWの参加ありがとうございます。\n` +
      `当日のローテーションが確定しましたのでお知らせします。\n\n` +
      `こちらからご確認ください。\n${url}\n\n` +
      `何か変更がありましたら${mc}までご連絡ください。`

    const assignedIds = new Set(recipients.map(r => r.userId))
    const adminRows = await this.db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.isAdmin, true))
    const admins: NotifyAdmin[] = adminRows
      .map(a => ({
        userId: a.id,
        name: a.name,
        email: a.email,
        alreadyAssigned: assignedIds.has(a.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ja'))

    const [last] = await this.db
      .select({
        sentAt: rotationNotifications.sentAt,
        recipientCount: rotationNotifications.recipientCount,
      })
      .from(rotationNotifications)
      .where(eq(rotationNotifications.scheduleId, scheduleId))
      .orderBy(desc(rotationNotifications.sentAt))
      .limit(1)

    return {
      recipients,
      admins,
      defaultSubject: subject,
      defaultBody: body,
      lastSentAt: last?.sentAt ?? null,
      lastRecipientCount: last?.recipientCount ?? null,
    }
  }

  async send(
    scheduleId: number,
    subject: string,
    body: string,
    senderId: number,
    apiKey: string,
    fromAddress: string,
    additionalUserIds: number[] = [],
  ): Promise<{ sent: number }> {
    const ctx = await this.loadContext(scheduleId)
    if (!ctx) throw new Error('スケジュールが見つかりません')
    const { recipients } = ctx

    const assignedIds = new Set(recipients.map(r => r.userId))
    const uniqueExtraIds = Array.from(new Set(additionalUserIds)).filter(id => !assignedIds.has(id))

    let extras: NotifyRecipient[] = []
    if (uniqueExtraIds.length > 0) {
      const extraRows = await this.db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(and(inArray(users.id, uniqueExtraIds), eq(users.isAdmin, true)))
      extras = extraRows.map(r => ({
        userId: r.id,
        name: r.name,
        email: r.email,
        assignments: [],
      }))
    }

    const allRecipients: NotifyRecipient[] = [...recipients, ...extras]
    if (allRecipients.length === 0) throw new Error('送信対象がいません')

    const emails = allRecipients.map(r => {
      const assignmentBlock = r.assignments.length > 0
        ? `\n\n━━━━━━━━━━━━━━\n【あなたの担当】\n${r.assignments.map(a => `  ${a.timeSlot}  ${a.location}`).join('\n')}\n━━━━━━━━━━━━━━`
        : ''
      const footer = `\n\n---\n※ このメールは送信専用です。返信はできません。`
      const finalBody = `${r.name} 様\n\n${body}${assignmentBlock}${footer}`
      return {
        from: fromAddress,
        to: [r.email],
        subject,
        text: finalBody,
      }
    })

    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emails),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`メール送信に失敗しました: ${errText}`)
    }

    await this.db.insert(rotationNotifications).values({
      scheduleId,
      subject,
      body,
      recipientCount: allRecipients.length,
      sentBy: senderId,
    })

    return { sent: allRecipients.length }
  }
}
