-- AlterTable
ALTER TABLE "indexes" ADD COLUMN     "answer" TEXT,
ADD COLUMN     "question" TEXT;

-- AlterTable
ALTER TABLE "scans" ADD COLUMN     "resolved" BOOLEAN NOT NULL DEFAULT true;
