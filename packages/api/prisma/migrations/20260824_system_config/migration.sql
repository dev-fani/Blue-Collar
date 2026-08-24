-- Global runtime configuration key/value store.
-- Backs the `isPaused` escrow kill-switch checked by escrow.service.
CREATE TABLE IF NOT EXISTS "SystemConfig" (
    "key"       TEXT NOT NULL,
    "value"     TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);
