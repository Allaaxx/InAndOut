-- AlterTable
ALTER TABLE "class_sessions" ADD COLUMN "classGroupId" TEXT;

-- CreateIndex
CREATE INDEX "class_sessions_classGroupId_idx" ON "class_sessions"("classGroupId");

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "class_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
