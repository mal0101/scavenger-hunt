-- Indexes are now round-independent: an index belongs to its game and its QR
-- code is scannable in EVERY round when the game is ACTIVE.

-- Drop the indexes.round_id column and its FK
ALTER TABLE "indexes" DROP CONSTRAINT "indexes_round_id_fkey";
ALTER TABLE "indexes" DROP COLUMN "round_id";

-- Drop the qr_codes.round_id column, its FK, its composite unique and its index
ALTER TABLE "qr_codes" DROP CONSTRAINT "qr_codes_round_id_fkey";
DROP INDEX "qr_codes_index_id_round_id_key";
DROP INDEX "qr_codes_round_id_idx";
ALTER TABLE "qr_codes" DROP COLUMN "round_id";

-- Enforce one QR code per index (the index is uniquely addressable in any round)
CREATE UNIQUE INDEX "qr_codes_index_id_key" ON "qr_codes"("index_id");