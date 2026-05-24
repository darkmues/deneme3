-- ============================================================
-- HAYAT Life OS — Database Schema
-- PostgreSQL 15+ | Production-Ready
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── USERS ──────────────────────────────────────────────────
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    avatar_url      TEXT,
    locale          VARCHAR(10) DEFAULT 'tr-TR',
    timezone        VARCHAR(50) DEFAULT 'Europe/Istanbul',
    plan            VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    onboarding_done BOOLEAN DEFAULT FALSE,
    streak_shield   INTEGER DEFAULT 0,  -- pro feature: missed day protection
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ  -- soft delete
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;

-- ─── SESSIONS / REFRESH TOKENS ─────────────────────────────
CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    device_info     JSONB,
    ip_address      INET,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id) WHERE revoked_at IS NULL;

-- ─── CATEGORIES (shared across modules) ────────────────────
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(50) NOT NULL,
    icon            VARCHAR(10),
    color           VARCHAR(7),   -- hex color
    module          VARCHAR(20) NOT NULL CHECK (module IN ('task', 'finance', 'habit')),
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name, module)
);

CREATE INDEX idx_categories_user_module ON categories(user_id, module);

-- ─── TASKS ──────────────────────────────────────────────────
CREATE TYPE task_priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done', 'archived');

CREATE TABLE tasks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    priority        task_priority DEFAULT 'medium',
    status          task_status DEFAULT 'todo',
    due_date        TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    sort_order      INTEGER DEFAULT 0,
    is_recurring    BOOLEAN DEFAULT FALSE,
    recurrence_rule JSONB,  -- { frequency: 'daily'|'weekly'|'monthly', interval: 1, days: [1,3,5] }
    tags            TEXT[] DEFAULT '{}',
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_tasks_user_status ON tasks(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_user_due ON tasks(user_id, due_date) WHERE deleted_at IS NULL AND status != 'done';
CREATE INDEX idx_tasks_tags ON tasks USING GIN(tags) WHERE deleted_at IS NULL;

-- ─── SUBTASKS ───────────────────────────────────────────────
CREATE TABLE subtasks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title           VARCHAR(500) NOT NULL,
    completed       BOOLEAN DEFAULT FALSE,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subtasks_task ON subtasks(task_id);

-- ─── FINANCE: ACCOUNTS ─────────────────────────────────────
CREATE TABLE accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    type            VARCHAR(20) NOT NULL CHECK (type IN ('cash', 'bank', 'credit_card', 'savings', 'investment')),
    currency        VARCHAR(3) DEFAULT 'TRY',
    balance         DECIMAL(15,2) DEFAULT 0,
    color           VARCHAR(7),
    icon            VARCHAR(10),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accounts_user ON accounts(user_id) WHERE is_active = TRUE;

-- ─── FINANCE: TRANSACTIONS ─────────────────────────────────
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');

CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id      UUID REFERENCES accounts(id) ON DELETE SET NULL,
    category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
    type            transaction_type NOT NULL,
    amount          DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency        VARCHAR(3) DEFAULT 'TRY',
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    date            DATE NOT NULL DEFAULT CURRENT_DATE,
    is_recurring    BOOLEAN DEFAULT FALSE,
    recurrence_rule JSONB,
    tags            TEXT[] DEFAULT '{}',
    receipt_url     TEXT,
    location        JSONB,  -- { lat, lng, name }
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_user_type ON transactions(user_id, type) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_user_category ON transactions(user_id, category_id) WHERE deleted_at IS NULL;

-- ─── FINANCE: BUDGETS ───────────────────────────────────────
CREATE TABLE budgets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES categories(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    amount          DECIMAL(15,2) NOT NULL,
    period          VARCHAR(10) DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'yearly')),
    start_date      DATE NOT NULL,
    end_date        DATE,
    alert_threshold DECIMAL(3,2) DEFAULT 0.80,  -- alert at 80%
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budgets_user ON budgets(user_id) WHERE is_active = TRUE;

-- ─── HABITS ─────────────────────────────────────────────────
CREATE TABLE habits (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    icon            VARCHAR(10),
    color           VARCHAR(7),
    frequency       VARCHAR(10) DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'custom')),
    target_days     INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',  -- 1=Mon, 7=Sun
    target_count    INTEGER DEFAULT 1,
    reminder_time   TIME,
    current_streak  INTEGER DEFAULT 0,
    best_streak     INTEGER DEFAULT 0,
    total_completions INTEGER DEFAULT 0,
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_habits_user ON habits(user_id) WHERE deleted_at IS NULL AND is_active = TRUE;

-- ─── HABIT COMPLETIONS ──────────────────────────────────────
CREATE TABLE habit_completions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id        UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    completed_date  DATE NOT NULL,
    count           INTEGER DEFAULT 1,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(habit_id, completed_date)
);

CREATE INDEX idx_habit_completions_habit_date ON habit_completions(habit_id, completed_date DESC);
CREATE INDEX idx_habit_completions_user_date ON habit_completions(user_id, completed_date DESC);

-- ─── NOTIFICATIONS ──────────────────────────────────────────
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(30) NOT NULL,  -- 'task_due', 'budget_alert', 'streak_risk', 'achievement', 'ai_insight'
    title           VARCHAR(255) NOT NULL,
    body            TEXT,
    data            JSONB DEFAULT '{}',
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;

-- ─── ACHIEVEMENTS / GAMIFICATION ────────────────────────────
CREATE TABLE achievements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(50) UNIQUE NOT NULL,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    icon            VARCHAR(10),
    points          INTEGER DEFAULT 10,
    criteria        JSONB NOT NULL  -- { type: 'streak', target: 30, module: 'habit' }
);

CREATE TABLE user_achievements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id  UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- ─── AI CHAT HISTORY ────────────────────────────────────────
CREATE TABLE ai_conversations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(255),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role            VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
    content         TEXT NOT NULL,
    tokens_used     INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_messages_conv ON ai_messages(conversation_id, created_at);

-- ─── ANALYTICS / DAILY SNAPSHOTS ────────────────────────────
CREATE TABLE daily_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    snapshot_date   DATE NOT NULL,
    tasks_completed INTEGER DEFAULT 0,
    tasks_created   INTEGER DEFAULT 0,
    total_spent     DECIMAL(15,2) DEFAULT 0,
    total_earned    DECIMAL(15,2) DEFAULT 0,
    habits_completed INTEGER DEFAULT 0,
    habits_total    INTEGER DEFAULT 0,
    productivity_score DECIMAL(5,2),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, snapshot_date)
);

CREATE INDEX idx_snapshots_user_date ON daily_snapshots(user_id, snapshot_date DESC);

-- ─── SEED: Default achievements ─────────────────────────────
INSERT INTO achievements (code, name, description, icon, points, criteria) VALUES
    ('streak_7', 'Haftalık Savaşçı', '7 gün üst üste alışkanlık tamamla', '🔥', 10, '{"type":"streak","target":7}'),
    ('streak_30', 'Aylık Titan', '30 gün üst üste alışkanlık tamamla', '💎', 50, '{"type":"streak","target":30}'),
    ('streak_100', 'Efsane', '100 gün üst üste alışkanlık tamamla', '👑', 200, '{"type":"streak","target":100}'),
    ('tasks_50', 'Görev Makinesi', '50 görev tamamla', '⚡', 30, '{"type":"tasks_completed","target":50}'),
    ('budget_master', 'Bütçe Ustası', '3 ay üst üste bütçe altında kal', '💰', 40, '{"type":"budget_under","target":3}'),
    ('early_bird', 'Erken Kuş', '30 gün erken kalkma alışkanlığı', '🌅', 35, '{"type":"streak","target":30,"habit":"early_rise"}'),
    ('first_task', 'İlk Adım', 'İlk görevini tamamla', '🎯', 5, '{"type":"tasks_completed","target":1}'),
    ('first_habit', 'Alışkanlık Başlangıcı', 'İlk alışkanlığını oluştur', '🌱', 5, '{"type":"habits_created","target":1}');

-- ─── FUNCTIONS ──────────────────────────────────────────────

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_habits_updated_at BEFORE UPDATE ON habits FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Calculate streak for a habit
CREATE OR REPLACE FUNCTION calculate_streak(p_habit_id UUID)
RETURNS INTEGER AS $$
DECLARE
    streak INTEGER := 0;
    check_date DATE := CURRENT_DATE;
    found BOOLEAN;
BEGIN
    LOOP
        SELECT EXISTS(
            SELECT 1 FROM habit_completions
            WHERE habit_id = p_habit_id AND completed_date = check_date
        ) INTO found;
        
        IF NOT found THEN
            EXIT;
        END IF;
        
        streak := streak + 1;
        check_date := check_date - INTERVAL '1 day';
    END LOOP;
    
    RETURN streak;
END;
$$ LANGUAGE plpgsql;

-- Monthly spending summary
CREATE OR REPLACE FUNCTION get_monthly_spending(p_user_id UUID, p_month DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(category_name VARCHAR, total DECIMAL, percentage DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.name,
        SUM(t.amount) AS total,
        ROUND(SUM(t.amount) / NULLIF(SUM(SUM(t.amount)) OVER(), 0) * 100, 1) AS percentage
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = p_user_id
      AND t.type = 'expense'
      AND t.deleted_at IS NULL
      AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', p_month)
    GROUP BY c.name
    ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql;
