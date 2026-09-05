-- CreateEnum
CREATE TYPE "QrStatus" AS ENUM ('ACTIVE', 'DEPLETED');

-- AlterTable: users (credentials auth: username + password_hash, phone becomes optional)
ALTER TABLE "users" ADD COLUMN "username" TEXT;
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT;

-- Backfill legacy rows so the DATABASE stays consistent (usernames are throwaway for
-- pre-existing dev/test users; the fresh seed creates real, usable creds).
UPDATE "users"
SET "username" = 'legacy_' || LEFT("id", 8)
WHERE "username" IS NULL;

UPDATE "users"
SET "password_hash" = '$2b$10$vWG.slmEW4xCanT8XmiiOOcU9506DoXHREjljslQGyHWkMCg9EINi'
WHERE "password_hash" IS NULL;

ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL;

-- phone_number loses its uniqueness constraint and becomes optional (identifier is now username)
ALTER TABLE "users" ALTER COLUMN "phone_number" DROP NOT NULL;
DROP INDEX "users_phone_number_key";

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- DropTable: OTP is replaced by credentials login
DROP TABLE "otps";

-- AlterTable: Player.rank is dead (ranks are computed at read time), drop it
ALTER TABLE "players" DROP COLUMN "rank";

-- AlterTable: Team gains a captain (the creator / principal of the team)
ALTER TABLE "teams" ADD COLUMN "captain_id" TEXT;
CREATE UNIQUE INDEX "teams_captain_id_key" ON "teams"("captain_id");
ALTER TABLE "teams" ADD CONSTRAINT "teams_captain_id_fkey" FOREIGN KEY ("captain_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: one-time single-claim QR codes (value pool, depleted on first scan)
CREATE TABLE "qr_codes" (
    "id" TEXT NOT NULL,
    "index_id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "pool_value" INTEGER NOT NULL,
    "status" "QrStatus" NOT NULL DEFAULT 'ACTIVE',
    "first_scanned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_index_id_round_id_key" ON "qr_codes"("index_id", "round_id");

-- CreateIndex
CREATE INDEX "qr_codes_game_id_idx" ON "qr_codes"("game_id");

-- CreateIndex
CREATE INDEX "qr_codes_round_id_idx" ON "qr_codes"("round_id");

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_index_id_fkey" FOREIGN KEY ("index_id") REFERENCES "indexes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;