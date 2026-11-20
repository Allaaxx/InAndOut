-- AlterTable
ALTER TABLE "students"
    ADD COLUMN "classGroupId" TEXT,
    ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "students_classGroupId_idx" ON "students"("classGroupId");

-- CreateIndex
CREATE INDEX "students_isActive_idx" ON "students"("isActive");

-- AddForeignKey
ALTER TABLE "students"
    ADD CONSTRAINT "students_classGroupId_fkey"
    FOREIGN KEY ("classGroupId") REFERENCES "class_groups"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
