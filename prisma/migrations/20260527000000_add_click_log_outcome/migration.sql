ALTER TABLE "ClickLog" ADD COLUMN IF NOT EXISTS "outcome" TEXT NOT NULL DEFAULT 'primary';

CREATE INDEX IF NOT EXISTS "ClickLog_linkId_outcome_idx" ON "ClickLog"("linkId", "outcome");
