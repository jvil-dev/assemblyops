-- DropForeignKey
ALTER TABLE "Congregation" DROP CONSTRAINT "Congregation_circuitId_fkey";

-- AlterTable
ALTER TABLE "Congregation" ALTER COLUMN "circuitId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Venue_state_idx" ON "Venue"("state");

-- CreateIndex
CREATE INDEX "Venue_region_idx" ON "Venue"("region");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_name_state_key" ON "Venue"("name", "state");

-- AddForeignKey
ALTER TABLE "Congregation" ADD CONSTRAINT "Congregation_circuitId_fkey" FOREIGN KEY ("circuitId") REFERENCES "Circuit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
