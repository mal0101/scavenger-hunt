-- AlterTable
ALTER TABLE "indexes" ADD COLUMN     "answer_options" TEXT,
ADD COLUMN     "hint" TEXT,
ADD COLUMN     "sequence_order" INTEGER NOT NULL DEFAULT 0;
