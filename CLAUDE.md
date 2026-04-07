# pw-cong

スポット管理・スケジュール申し込みを行うフルスタック Web アプリ。

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | Vue 3 + TypeScript + Vite + Tailwind CSS v4 + Pinia |
| Backend | Hono + Drizzle ORM + SQLite + Bun |
| 認証 | JWT（7日間有効、localStorage 保持） |
| アイコン | Material Icons |

## プロジェクト構成

```
pw-cong/                         # bun workspaces モノリポ
├── apps/
│   ├── frontend/                # Vite dev: :5173
│   └── backend/                 # Hono API: :3000
├── docker-compose.yml
├── Makefile
└── package.json
```

## 開発コマンド

```bash
# ローカル
bun run dev:backend
bun run dev:frontend
bun run seed                     # DB 初期データ投入

# Docker
make build / make up / make down / make logs / make seed
```

## フロントエンド (`apps/frontend/src/`)

```
pages/
  Dashboard.vue                  # ルートシェル（Header + Sidebar + ページルーティング）
  Login.vue
  Users.vue                      # ユーザー管理（admin のみ）
  Spots.vue                      # スポット管理（admin のみ）
  Schedules.vue                  # スケジュール一覧

components/
  DashboardHome.vue              # ダッシュボードトップ（受付中スケジュールをリスト表示）
  Sidebar.vue
  schedule/
    ScheduleFilterBar.vue
    ScheduleFormModal.vue
    ScheduleList.vue
    ScheduleStatusBadge.vue
  spot/
    PointInput.vue               # Google Maps 地点座標入力
    SpotForm.vue
    SpotList.vue
  user/
    UserCsvUpload.vue
    UserForm.vue
    UserTable.vue

store/
  auth.ts                        # JWT トークン・ユーザー情報（Pinia）
  nav.ts                         # activePage・sidebarOpen（Pinia）

composables/
  useApi.ts                      # fetch ラッパー、Authorization ヘッダ付与
  useGoogleMaps.ts
  useNotify.ts                   # トースト通知

constants/
  scheduleStatus.ts              # 'draft' | 'open' | 'confirmed'
  gender.ts
  index.ts                       # APP_NAME など
```

### ページルーティング

SPA。`nav.activePage` の値で `Dashboard.vue` 内でコンポーネントを切り替える。

| activePage | 表示コンポーネント |
|-----------|-----------------|
| `''`（デフォルト） | `DashboardHome` |
| `'schedules'` | `SchedulesPage` |
| `'spots'` | `SpotsPage` |
| `'users'` | `UsersPage` |

### Vite プロキシ

`/api/*` → `http://localhost:3000`

## バックエンド (`apps/backend/src/`)

```
index.ts                         # Bun サーバー起動（port: 3000）
app.ts                           # Hono アプリ定義・CORS
auth.ts                          # generateToken / verifyToken / authMiddleware / adminMiddleware

routes/
  auth.ts                        # /api/login, /api/me, /api/me/password
  users.ts                       # /api/users (CRUD + bulk CSV)
  spots.ts                       # /api/spots (CRUD)
  schedules.ts                   # /api/schedules (CRUD + ページング)

services/
  AuthService.ts
  UserService.ts
  SpotService.ts
  ScheduleService.ts

db/
  schema.ts                      # Drizzle スキーマ定義
  index.ts                       # SQLite 初期化
  create.ts

seed.ts                          # admin@example.com / user@example.com（password）
```

## データベーススキーマ

### users
| カラム | 型 | 備考 |
|-------|---|------|
| id | integer PK | |
| email | string unique | |
| name | string | |
| passwordHash | string | bcryptjs |
| isAdmin | boolean | default false |
| gender | string nullable | |
| createdAt | string | |

### spots
| カラム | 型 | 備考 |
|-------|---|------|
| id | integer PK | |
| name | string | |
| startTime | string | 営業時間開始 |
| endTime | string | 営業時間終了 |
| createdAt | string | |

### spotPoints（スポット内の地点）
| カラム | 型 | 備考 |
|-------|---|------|
| id | integer PK | |
| spotId | integer FK | → spots.id |
| name | string | |
| lat | float nullable | |
| lng | float nullable | |
| address | string nullable | |
| sortOrder | integer | default 0 |

### schedules
| カラム | 型 | 備考 |
|-------|---|------|
| id | integer PK | |
| date | string | |
| spotId | integer FK | → spots.id |
| status | 'draft'\|'open'\|'confirmed' | default 'draft' |
| createdAt / updatedAt | string | |

### applications（申し込み）
| カラム | 型 | 備考 |
|-------|---|------|
| id | integer PK | |
| scheduleId | integer FK | → schedules.id |
| userId | integer FK | → users.id |
| selectedSlots | string | JSON 配列 |
| cartPrepare | 'yes'\|'no' | カート準備 |
| cartCleanup | 'yes'\|'no' | カート片付け |
| carTransport | 'yes'\|'no' | 車で運搬 |
| notes | string nullable | |
| createdAt / updatedAt | string | |
| unique | (scheduleId, userId) | |

## API ルート

```
# 認証（全員）
POST   /api/login
GET    /api/me
PUT    /api/me/password

# ユーザー管理（admin のみ）
GET    /api/users
POST   /api/users
POST   /api/users/bulk         # CSV インポート
PUT    /api/users/:id
DELETE /api/users/:id

# スポット（参照: 全員 / 変更: admin）
GET    /api/spots
POST   /api/spots
PUT    /api/spots/:id
DELETE /api/spots/:id

# スケジュール（参照: 全員 / 変更: admin）
GET    /api/schedules          # ?page=&limit=&status=
POST   /api/schedules
PUT    /api/schedules/:id
DELETE /api/schedules/:id
```

## 権限モデル

- `authMiddleware` — ログイン必須（全エンドポイント）
- `adminMiddleware` — 管理者のみ（ユーザー管理・スポット/スケジュール変更系）

## UI 方針

- ダッシュボード（DashboardHome）はお知らせ風のリスト表示（カードグリッドは使わない）
- スタイルは Tailwind CSS のユーティリティクラスで記述
- インジゴ（indigo）をブランドカラーとして使用
