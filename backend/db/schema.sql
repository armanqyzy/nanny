-- ============================================================
-- Nanny platform — PostgreSQL schema
-- ============================================================

DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS notification_jobs CASCADE;
DROP TABLE IF EXISTS favorite_sitters CASCADE;
DROP TABLE IF EXISTS booking_updates CASCADE;
DROP TABLE IF EXISTS sitter_review_events CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS sitter_services CASCADE;
DROP TABLE IF EXISTS sitters CASCADE;
DROP TABLE IF EXISTS pets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ------------------------------------------------------------
-- Users (owners / sitters / admins all live here)
-- ------------------------------------------------------------
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(120) NOT NULL,
    email           VARCHAR(160) UNIQUE NOT NULL,
    phone           VARCHAR(40),
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'owner'
                    CHECK (role IN ('owner','sitter','admin')),
    avatar_url      TEXT,
    address         VARCHAR(255),
    emergency_contact_name VARCHAR(120),
    emergency_contact_phone VARCHAR(40),
    emergency_contact_notes TEXT,
    is_blocked      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Pets belong to an owner (user)
-- ------------------------------------------------------------
CREATE TABLE pets (
    id              SERIAL PRIMARY KEY,
    owner_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(80) NOT NULL,
    pet_type        VARCHAR(30) NOT NULL,    -- dog / cat / bird / other
    gender          VARCHAR(10),
    age             INTEGER,
    size            VARCHAR(20),             -- small / medium / large
    care_type       VARCHAR(30),             -- easy / medium / difficult
    behavior        TEXT,
    health          TEXT,
    description     TEXT,
    photo_url       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Sitter profile, 1-to-1 with users where role = 'sitter'
-- ------------------------------------------------------------
CREATE TABLE sitters (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description     TEXT,
    experience_yrs  INTEGER     NOT NULL DEFAULT 0,
    city            VARCHAR(80) NOT NULL DEFAULT 'Almaty',
    district        VARCHAR(80),
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    price_per_day   NUMERIC(10,2) NOT NULL DEFAULT 0,
    rating          NUMERIC(3,2)  NOT NULL DEFAULT 0,
    rating_count    INTEGER       NOT NULL DEFAULT 0,
    fraud_score     DOUBLE PRECISION NOT NULL DEFAULT 0,
    is_flagged      BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified     BOOLEAN       NOT NULL DEFAULT FALSE,
    review_status   VARCHAR(24)   NOT NULL DEFAULT 'new'
                    CHECK (review_status IN ('new','in_review','approved','changes_requested','rejected')),
    admin_notes     TEXT,
    reviewed_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at     TIMESTAMPTZ,
    rejection_reason TEXT,
    id_document_url TEXT,
    background_check_status VARCHAR(24) NOT NULL DEFAULT 'pending'
                    CHECK (background_check_status IN ('pending','submitted','manual_review','approved','rejected')),
    service_area_text TEXT,
    service_radius_km INTEGER NOT NULL DEFAULT 10,
    work_days TEXT,
    work_start TIME,
    work_end TIME,
    auto_reply_templates JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_available    BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE sitter_review_events (
    id          SERIAL PRIMARY KEY,
    sitter_id   INTEGER NOT NULL REFERENCES sitters(id) ON DELETE CASCADE,
    actor_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(40) NOT NULL,
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- services a sitter offers: walking / boarding / home_visit / grooming
CREATE TABLE sitter_services (
    id          SERIAL PRIMARY KEY,
    sitter_id   INTEGER NOT NULL REFERENCES sitters(id) ON DELETE CASCADE,
    service     VARCHAR(40) NOT NULL,
    price       NUMERIC(10,2) NOT NULL
);

-- ------------------------------------------------------------
-- Bookings connect owner + sitter + pet
-- ------------------------------------------------------------
CREATE TABLE bookings (
    id              SERIAL PRIMARY KEY,
    owner_id        INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    sitter_id       INTEGER NOT NULL REFERENCES sitters(id) ON DELETE CASCADE,
    pet_id          INTEGER NOT NULL REFERENCES pets(id)    ON DELETE CASCADE,
    service         VARCHAR(40) NOT NULL,
    start_date      DATE        NOT NULL,
    end_date        DATE        NOT NULL,
    start_time      TIME,
    end_time        TIME,
    total_price     NUMERIC(10,2) NOT NULL DEFAULT 0,
    status          VARCHAR(20)   NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','completed','cancelled')),
    notes           TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE booking_updates (
    id              SERIAL PRIMARY KEY,
    booking_id      INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    sender_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    update_type     VARCHAR(20) NOT NULL CHECK (update_type IN ('update','photo','status')),
    body            TEXT,
    photo_url       TEXT,
    status_label    VARCHAR(120),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- In-platform messaging (kept per Lab-2 NFR-5: 90-day retention)
-- ------------------------------------------------------------
CREATE TABLE messages (
    id          SERIAL PRIMARY KEY,
    sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body        TEXT,
    audio_url   TEXT,
    image_url   TEXT,
    file_url    TEXT,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    is_delivered BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_for_everyone BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_pair ON messages(sender_id, receiver_id, created_at);

CREATE TABLE message_hidden_for_users (
    message_id  INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id)
);

CREATE TABLE deleted_conversations (
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    other_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deleted_before TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, other_user_id)
);

CREATE TABLE notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(40) NOT NULL,
    title       VARCHAR(160) NOT NULL,
    body        TEXT,
    meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE favorite_sitters (
    owner_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sitter_id       INTEGER NOT NULL REFERENCES sitters(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (owner_id, sitter_id)
);

CREATE TABLE notification_jobs (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id      INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    type            VARCHAR(40) NOT NULL,
    channel         VARCHAR(20) NOT NULL CHECK (channel IN ('email','sms')),
    destination     TEXT NOT NULL,
    title           VARCHAR(160) NOT NULL,
    body            TEXT NOT NULL,
    due_at          TIMESTAMPTZ NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued','sent','failed','cancelled')),
    meta            JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE support_tickets (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category        VARCHAR(40) NOT NULL,
    priority        VARCHAR(20) NOT NULL DEFAULT 'normal',
    status          VARCHAR(20) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','in_progress','resolved','closed')),
    subject         VARCHAR(180) NOT NULL,
    body            TEXT NOT NULL,
    assigned_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ai_summary      TEXT,
    ai_suggested_category VARCHAR(40),
    ai_suggested_priority VARCHAR(20),
    ai_first_reply  TEXT,
    resolution_note TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Reviews: FR-6 — only after booking completion
-- ------------------------------------------------------------
CREATE TABLE reviews (
    id          SERIAL PRIMARY KEY,
    booking_id  INTEGER UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    author_id   INTEGER NOT NULL REFERENCES users(id)           ON DELETE CASCADE,
    sitter_id   INTEGER NOT NULL REFERENCES sitters(id)         ON DELETE CASCADE,
    rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body        TEXT    NOT NULL CHECK (char_length(body) >= 30),
    is_hidden   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Shop: products, orders, order items
-- ------------------------------------------------------------
CREATE TABLE products (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(160) NOT NULL,
    category    VARCHAR(40)  NOT NULL,   -- food / collar / toy / other
    description TEXT,
    price       NUMERIC(10,2) NOT NULL,
    image_url   TEXT,
    stock       INTEGER NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total       NUMERIC(10,2) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'new'
                CHECK (status IN ('new','paid','shipped','delivered','cancelled')),
    address     VARCHAR(255),
    customer_email VARCHAR(160),
    customer_name VARCHAR(120),
    customer_phone VARCHAR(40),
    payment_method VARCHAR(40),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_reference VARCHAR(120),
    payment_last4 VARCHAR(4),
    paid_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id),
    quantity    INTEGER NOT NULL,
    unit_price  NUMERIC(10,2) NOT NULL
);

-- helpful indexes
CREATE INDEX idx_bookings_owner  ON bookings(owner_id);
CREATE INDEX idx_bookings_sitter ON bookings(sitter_id);
CREATE INDEX idx_pets_owner      ON pets(owner_id);
CREATE INDEX idx_sitters_city    ON sitters(city);
CREATE INDEX idx_booking_updates_booking ON booking_updates(booking_id, created_at);
CREATE INDEX idx_message_hidden_user ON message_hidden_for_users(user_id, message_id);
CREATE INDEX idx_deleted_conversations_user ON deleted_conversations(user_id, other_user_id, deleted_before);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_favorite_sitters_owner_created ON favorite_sitters(owner_id, created_at DESC);
CREATE INDEX idx_notification_jobs_due ON notification_jobs(status, due_at) WHERE processed_at IS NULL;
CREATE INDEX idx_support_tickets_user_created ON support_tickets(user_id, created_at DESC);
CREATE INDEX idx_support_tickets_status_created ON support_tickets(status, created_at DESC);
