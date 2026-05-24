# 🌟 HAYAT Life OS

AI-powered life management platform — görev yönetimi, finans takibi, alışkanlık izleme, yapay zeka asistan.

## Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Backend | Node.js 20, Express, PostgreSQL 16, Redis 7, JWT, Zod |
| Mobile | React Native, Expo 52, React Navigation |
| Infra | Docker Compose, GitHub Actions CI |

## Hızlı Başlangıç

### 1. Backend

```bash
cd backend
cp .env.example .env

# JWT secret üret ve .env'e yapıştır:
openssl rand -hex 32    # → JWT_ACCESS_SECRET
openssl rand -hex 32    # → JWT_REFRESH_SECRET

# Veritabanı + Redis başlat
docker-compose up -d

# Bağımlılıkları kur
npm install

# Migration çalıştır (Docker'sız kurulumda)
npm run migrate

# Demo veri yükle (opsiyonel)
npm run seed
# → Giriş: demo@hayat.app / Demo1234

# Sunucuyu başlat
npm run dev
# ✅ http://localhost:3001/health
```

### 2. Mobil Uygulama

```bash
cd mobile
npm install

# ⚠️ ÖNEMLİ: src/config/env.js dosyasında YOUR_IP_HERE yerine
# kendi bilgisayarının local IP adresini yaz.
# Terminal'de: ifconfig (Mac) veya ipconfig (Windows)

npx expo start
# QR kodu Expo Go ile telefondan tara
```

### 3. Production Build

```bash
cd mobile
npx eas build --platform android   # APK/AAB
npx eas build --platform ios       # IPA
```

## Proje Yapısı

```
hayat-life-os/
├── .github/workflows/ci.yml    # GitHub Actions CI
├── LICENSE                      # MIT
├── README.md
├── backend/
│   ├── src/
│   │   ├── config/index.js     # Env config + secret warnings
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT verify + token generate
│   │   │   └── validate.js     # Zod schemas (tüm endpointler)
│   │   ├── models/db.js        # PG pool + query helpers
│   │   ├── routes/
│   │   │   ├── auth.js         # Register/Login/Refresh/Profile
│   │   │   ├── tasks.js        # CRUD + subtasks + bulk + stats
│   │   │   ├── finance.js      # Transactions + budgets + analytics
│   │   │   ├── habits.js       # CRUD + complete + streaks + heatmap
│   │   │   ├── ai.js           # Claude chat + insights + weekly report
│   │   │   ├── dashboard.js    # Aggregated overview (10 parallel queries)
│   │   │   ├── categories.js   # Shared module categories
│   │   │   └── notifications.js
│   │   ├── utils/
│   │   │   ├── errors.js       # AppError hierarchy + asyncHandler
│   │   │   ├── migrate.js      # Migration runner
│   │   │   └── seed.js         # Demo data seeder
│   │   ├── tests/
│   │   │   └── auth.test.js    # Auth + validation tests
│   │   └── server.js           # Express app
│   ├── migrations/
│   │   └── 001_initial_schema.sql  # 19 tablo + triggers + functions
│   ├── docker-compose.yml
│   ├── Dockerfile              # Multi-stage, non-root, healthcheck
│   ├── .dockerignore
│   └── .env.example
└── mobile/
    ├── App.js                  # Entry + font loading + providers
    ├── app.json                # Expo config
    ├── eas.json                # EAS Build profiles
    ├── assets/                 # Icon, splash (placeholder)
    └── src/
        ├── config/env.js       # API URL config
        ├── context/
        │   ├── AuthContext.js   # Login/Register/Logout + persistence
        │   └── AppContext.js    # Global state + haptic feedback
        ├── components/UI.js     # ScoreRing, Card, Button, Badge...
        ├── screens/             # 7 ekran
        ├── navigation/          # Bottom tabs + stack
        ├── services/api.js      # HTTP client + JWT auto-refresh
        ├── hooks/               # useRefreshable, formatCurrency...
        └── utils/notifications.js
```

## API Endpoints (40+)

| Modül | Endpoint | İşlev |
|-------|----------|-------|
| Auth | `POST /api/auth/register` | Kayıt + default data oluşturma |
| Auth | `POST /api/auth/login` | JWT token pair üretimi |
| Auth | `POST /api/auth/refresh` | Access token yenileme |
| Auth | `GET /api/auth/me` | Profil + istatistikler |
| Tasks | `GET /api/tasks` | Filter + sort + paginate |
| Tasks | `POST /api/tasks` | Oluştur |
| Tasks | `PUT /api/tasks/:id` | Güncelle (auto completed_at) |
| Tasks | `PATCH /api/tasks/bulk` | Toplu complete/delete/update |
| Tasks | `GET /api/tasks/stats/overview` | İstatistikler |
| Tasks | `POST /api/tasks/:id/subtasks` | Alt görev ekle |
| Finance | `GET /api/finance/transactions` | Multi-filter + paginate |
| Finance | `POST /api/finance/transactions` | Oluştur + hesap bakiye güncelle |
| Finance | `GET /api/finance/analytics/summary` | Kategori + trend + top expenses |
| Finance | `GET /api/finance/analytics/monthly-comparison` | 12 aylık karşılaştırma |
| Finance | `GET/POST /api/finance/budgets` | Bütçe + otomatik harcama takibi |
| Habits | `POST /api/habits/:id/complete` | Tamamla + streak hesapla (DB fn) |
| Habits | `DELETE /api/habits/:id/complete` | Geri al + streak recalc |
| Habits | `GET /api/habits/analytics/overview` | Heatmap + consistency ranking |
| AI | `POST /api/ai/chat` | Claude API + context-aware fallback |
| AI | `GET /api/ai/insights` | Otomatik analiz + öneriler |
| AI | `GET /api/ai/weekly-report` | Haftalık skor + daily breakdown |
| Dashboard | `GET /api/dashboard` | Hayat Score + 10 paralel sorgu |

## Test

```bash
cd backend
npm run dev &          # Server'ı başlat
npm test               # Auth + validation testleri
```

## Lisans

MIT — [LICENSE](LICENSE)
