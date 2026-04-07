const BASE_URL = 'http://localhost:3000'
const SCHEDULE_ID = 1
const ALL_SLOTS = ['12:30〜13:00', '13:00〜13:30', '13:30〜14:00']
const NOTES_POOL = [
  'よろしくお願いします',
  '初めての参加です。楽しみにしています',
  '少し遅れるかもしれません',
  '頑張ります！',
  '体調によっては欠席する可能性があります',
  '車で行く予定です',
  '電車で行きます',
  'よろしくお願いいたします',
  '参加できることを楽しみにしています',
  '準備しておきます',
  'できる限り参加します',
  'お世話になります。よろしくお願いします',
  '積極的に参加したいと思います',
  '初参加です。よろしくお願いします',
  '精一杯頑張ります',
]

const USERS = [
  'tanaka.kenji@example.com',
  'suzuki.hiroshi@example.com',
  'sato.takuma@example.com',
  'yamamoto.ryota@example.com',
  'ito.shota@example.com',
  'watanabe.yuki@example.com',
  'nakamura.haruka@example.com',
  'kobayashi.ayaka@example.com',
  'kato.misaki@example.com',
  'yoshida.rina@example.com',
  'yamada.nana@example.com',
  'hayashi.mao@example.com',
  'inoue.yuna@example.com',
  'kimura.saki@example.com',
  'matsumoto.aoi@example.com',
]

function randomYesNo(): 'yes' | 'no' {
  return Math.random() < 0.5 ? 'yes' : 'no'
}

function randomSlots(): string[] {
  const count = Math.floor(Math.random() * 3) + 1 // 1〜3枠
  const shuffled = [...ALL_SLOTS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).sort((a, b) => a.localeCompare(b))
}

async function login(email: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password' }),
  })
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`)
  const data = await res.json() as { token: string }
  return data.token
}

async function applySchedule(token: string, email: string, noteIndex: number) {
  const slots = randomSlots()
  const body = {
    scheduleId: SCHEDULE_ID,
    selectedSlots: slots,
    cartPrepare: randomYesNo(),
    cartCleanup: randomYesNo(),
    carTransport: randomYesNo(),
    notes: NOTES_POOL[noteIndex % NOTES_POOL.length],
  }

  const res = await fetch(`${BASE_URL}/api/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Apply failed for ${email}: ${res.status} ${err}`)
  }

  const data = await res.json()
  console.log(`✓ ${email.padEnd(38)} slots: ${slots.join(', ')}`)
  return data
}

async function main() {
  console.log(`スケジュール ID:${SCHEDULE_ID}（2026-04-11）への申し込みテスト開始\n`)

  let ok = 0
  let ng = 0

  for (let i = 0; i < USERS.length; i++) {
    const email = USERS[i]
    try {
      const token = await login(email)
      await applySchedule(token, email, i)
      ok++
    } catch (e: any) {
      console.error(`✗ ${email}: ${e.message}`)
      ng++
    }
  }

  console.log(`\n完了: 成功 ${ok}件 / 失敗 ${ng}件`)
}

main()
