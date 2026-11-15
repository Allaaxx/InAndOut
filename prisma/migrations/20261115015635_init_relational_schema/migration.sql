-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "pinCodeHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_sessions" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "teacherName" TEXT DEFAULT 'Professor',
    "roomId" TEXT DEFAULT 'SALA-01',
    "classCode" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER DEFAULT 50,
    "defaultTimeLimitMinutes" INTEGER DEFAULT 10,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "ra" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "classCode" TEXT NOT NULL,
    "hasSpecialCondition" BOOLEAN NOT NULL DEFAULT false,
    "specialLimitMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movement_records" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT,
    "studentRa" TEXT NOT NULL,
    "studentFullName" TEXT NOT NULL,
    "studentPublicName" TEXT,
    "classCode" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "roomId" TEXT,
    "teacherName" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "durationMinutes" DOUBLE PRECISION,
    "allowedLimitMinutes" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'IN_TRANSIT',
    "outcome" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "escalatedReason" TEXT,
    "resolutionNotes" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "attendancePercentage" DOUBLE PRECISION,
    "attendedMinutes" DOUBLE PRECISION,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "authorizedByTeacherId" TEXT,
    "overdueAt" TIMESTAMP(3),
    "escalationType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movement_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waiting_queue_entries" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentRa" TEXT NOT NULL,
    "studentFullName" TEXT NOT NULL,
    "studentPublicName" TEXT,
    "classCode" TEXT,
    "position" INTEGER NOT NULL DEFAULT 1,
    "enqueuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calledAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waiting_queue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "class_sessions_teacherId_idx" ON "class_sessions"("teacherId");

-- CreateIndex
CREATE INDEX "class_sessions_classCode_idx" ON "class_sessions"("classCode");

-- CreateIndex
CREATE INDEX "class_sessions_status_idx" ON "class_sessions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "students_ra_key" ON "students"("ra");

-- CreateIndex
CREATE INDEX "students_classCode_idx" ON "students"("classCode");

-- CreateIndex
CREATE INDEX "students_ra_idx" ON "students"("ra");

-- CreateIndex
CREATE INDEX "movement_records_sessionId_idx" ON "movement_records"("sessionId");

-- CreateIndex
CREATE INDEX "movement_records_studentRa_idx" ON "movement_records"("studentRa");

-- CreateIndex
CREATE INDEX "movement_records_classCode_idx" ON "movement_records"("classCode");

-- CreateIndex
CREATE INDEX "movement_records_status_idx" ON "movement_records"("status");

-- CreateIndex
CREATE INDEX "waiting_queue_entries_sessionId_idx" ON "waiting_queue_entries"("sessionId");

-- CreateIndex
CREATE INDEX "waiting_queue_entries_studentRa_idx" ON "waiting_queue_entries"("studentRa");

-- CreateIndex
CREATE INDEX "waiting_queue_entries_status_idx" ON "waiting_queue_entries"("status");

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movement_records" ADD CONSTRAINT "movement_records_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiting_queue_entries" ADD CONSTRAINT "waiting_queue_entries_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
