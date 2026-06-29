/*
  Warnings:

  - Added the required column `departmentId` to the `SafetyIncident` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SafetyIncident" ADD COLUMN     "departmentId" TEXT;

UPDATE "SafetyIncident" si
SET "departmentId" = ev."departmentId"
FROM "EventVolunteer" ev
WHERE si."reportedById" = ev."id";

ALTER TABLE "SafetyIncident" ALTER COLUMN "departmentId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "SafetyIncident_departmentId_idx" ON "SafetyIncident"("departmentId");

-- AddForeignKey
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
