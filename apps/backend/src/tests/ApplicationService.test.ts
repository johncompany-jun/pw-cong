import { describe, test, expect, beforeAll } from 'bun:test'
import { createTestDb } from './setup'
import { UserService } from '../services/UserService'
import { ScheduleService } from '../services/ScheduleService'
import { SpotService } from '../services/SpotService'
import { ApplicationService } from '../services/ApplicationService'

const db = createTestDb()
const appService = new ApplicationService(db)
let userId: number
let scheduleId: number

describe('ApplicationService', () => {
  beforeAll(async () => {
    const spotService = new SpotService(db)
    const spot = await spotService.create({ name: 'テストスポット', startTime: '12:30', endTime: '14:00', points: [] })

    const scheduleService = new ScheduleService(db)
    const schedule = await scheduleService.create({ date: '2026-05-01', spotId: spot.id, status: 'open' })
    scheduleId = schedule.id

    const userService = new UserService(db)
    const user = await userService.create({ email: 'apply@example.com', name: '申込者', isAdmin: false, gender: null })
    userId = user.id
  })

  test('申し込みを作成できる', async () => {
    const app = await appService.create({
      scheduleId,
      userId,
      selectedSlots: ['12:30〜13:00', '13:00〜13:30'],
      cartPrepare: 'yes',
      cartCleanup: 'no',
      carTransport: 'no',
      notes: 'よろしくお願いします',
    })
    expect(app.scheduleId).toBe(scheduleId)
    expect(app.userId).toBe(userId)
    expect(JSON.parse(app.selectedSlots)).toEqual(['12:30〜13:00', '13:00〜13:30'])
    expect(app.cartPrepare).toBe('yes')
  })

  test('同じスケジュールへの重複申し込みはエラー', async () => {
    expect(
      appService.create({
        scheduleId,
        userId,
        selectedSlots: ['13:30〜14:00'],
        cartPrepare: 'no',
        cartCleanup: 'no',
        carTransport: 'no',
      })
    ).rejects.toThrow('すでにこのスケジュールへの申込が存在します')
  })

  test('スケジュール別申し込み一覧（ユーザー情報付き）が取得できる', async () => {
    const list = await appService.listByScheduleWithUsers(scheduleId)
    expect(list.length).toBe(1)
    expect(list[0].user.name).toBe('申込者')
  })

  test('承認済みスロットを更新できる', async () => {
    const [app] = await appService.listBySchedule(scheduleId)
    const updated = await appService.updateApprovedSlots(app.id, ['12:30〜13:00'])
    expect(JSON.parse(updated.approvedSlots!)).toEqual(['12:30〜13:00'])
  })

  test('参加ステータスを更新できる', async () => {
    const [app] = await appService.listBySchedule(scheduleId)
    const updated = await appService.updateParticipationStatus(app.id, 'approved')
    expect(updated.participationStatus).toBe('approved')
  })

  test('申し込みを削除できる', async () => {
    const [app] = await appService.listBySchedule(scheduleId)
    await appService.delete(app.id, userId)
    const list = await appService.listBySchedule(scheduleId)
    expect(list.length).toBe(0)
  })
})
