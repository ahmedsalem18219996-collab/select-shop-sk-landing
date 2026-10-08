CREATE TABLE IF NOT EXISTS customers(
 phone TEXT PRIMARY KEY,
 name TEXT NOT NULL DEFAULT '',
 last_message_at INTEGER NOT NULL DEFAULT 0,
 last_inbound_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS messages(
 id TEXT PRIMARY KEY,
 phone TEXT NOT NULL,
 direction TEXT NOT NULL CHECK(direction IN ('in','out')),
 kind TEXT NOT NULL,
 body TEXT NOT NULL,
 occurred_at INTEGER NOT NULL,
 FOREIGN KEY(phone) REFERENCES customers(phone)
);
CREATE INDEX IF NOT EXISTS idx_messages_phone_time ON messages(phone,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_last_message ON customers(last_message_at DESC);
