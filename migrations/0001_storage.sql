-- Redis-style storage on D1: strings/counters, sorted sets and HyperLogLog registers.
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL, exp INTEGER);
CREATE TABLE IF NOT EXISTS zset (key TEXT NOT NULL, member TEXT NOT NULL, score REAL NOT NULL, exp INTEGER, PRIMARY KEY (key, member));
CREATE INDEX IF NOT EXISTS zset_key_score ON zset (key, score);
CREATE TABLE IF NOT EXISTS hll (key TEXT PRIMARY KEY, regs BLOB NOT NULL, exp INTEGER);
CREATE INDEX IF NOT EXISTS kv_exp ON kv (exp);
CREATE INDEX IF NOT EXISTS zset_exp ON zset (exp);
CREATE INDEX IF NOT EXISTS hll_exp ON hll (exp);
