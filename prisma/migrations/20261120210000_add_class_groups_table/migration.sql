-- CreateTable
CREATE TABLE "class_groups" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "class_groups_code_academicYear_key" ON "class_groups"("code", "academicYear");

-- CreateIndex
CREATE INDEX "class_groups_academicYear_idx" ON "class_groups"("academicYear");

-- CreateIndex
CREATE INDEX "class_groups_isActive_idx" ON "class_groups"("isActive");
