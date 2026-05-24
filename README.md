# 🌟 HAYAT Life OS

AI-powered life management platform — görev yönetimi, finans takibi, alışkanlık izleme, yapay zeka asistan.

## Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Backend | Node.js, Express, PostgreSQL, JWT |
| Web Frontend | React (Artifact) |
| Mobile | React Native, Expo |
| Infra | Docker Compose |

## Hızlı Başlangıç

### 1. Repo'yu klonla
```bash
git clone https://github.com/YOUR_USER/hayat-life-os.git
cd hayat-life-os
```

### 2. Backend'i başlat
```bash
cd backend
cp .env.example .env        # Env değişkenlerini düzenle
docker-compose up -d         # PostgreSQL + Redis
npm install
npm run dev                  # http://localhost:3001
```

### 3. Mobil uygulamayı başlat
```bash
cd mobile
npm install
npx expo start               # QR kod ile telefonda aç
```

## Proje Yapısı

```
hayat-life-os/
├── backend/                 # Node.js API
│   ├── src/
│   │   ├── routes/          # Auth, Tasks, Finance, Habits, AI, Dashboard
│   │   ├── middleware/      # JWT auth, Zod validation
│   │   ├── models/          # DB connection + query helpers
│   │   ├── utils/           # Error handling
│   │   └── config/          # Environment config
│   ├── migrations/          # PostgreSQL schema
│   ├── docker-compose.yml
│   └── Dockerfile
├── mobile/                  # React Native / Expo
│   ├── src/
│   │   ├── screens/         # 7 ekran
│   │   ├── components/      # Shared UI
│   │   ├── context/         # Auth + App state
│   │   ├── services/        # API client
│   │   ├── navigation/      # Tab + Stack nav
│   │   ├── hooks/           # Custom hooks
│   │   ├── theme/           # Design tokens
│   │   └── utils/           # Push notifications
│   └── App.js
└── README.md
```

## API Endpoints

### Auth
- `POST /api/auth/register` — Kayıt
- `POST /api/auth/login` — Giriş
- `POST /api/auth/refresh` — Token yenile
- `GET /api/auth/me` — Profil
- `PUT /api/auth/me` — Profil güncelle

### Tasks
- `GET /api/tasks` — Liste (filter, sort, paginate)
- `POST /api/tasks` — Oluştur
- `PUT /api/tasks/:id` — Güncelle
- `DELETE /api/tasks/:id` — Sil
- `PATCH /api/tasks/bulk` — Toplu işlem
- `GET /api/tasks/stats/overview` — İstatistikler

### Finance
- `GET/POST/PUT/DELETE /api/finance/transactions`
- `GET /api/finance/analytics/summary`
- `GET /api/finance/analytics/monthly-comparison`
- `GET/POST /api/finance/budgets`
- `GET/POST /api/finance/accounts`

### Habits
- `GET/POST/PUT/DELETE /api/habits`
- `POST /api/habits/:id/complete`
- `DELETE /api/habits/:id/complete`
- `GET /api/habits/analytics/overview`

### AI
- `POST /api/ai/chat`
- `GET /api/ai/insights`
- `GET /api/ai/weekly-report`

### Dashboard
- `GET /api/dashboard` — Aggregated overview

## Lisans
MIT
