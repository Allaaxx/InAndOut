-- CreateIndex
CREATE INDEX "class_sessions_roomId_idx" ON "class_sessions"("roomId");

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("code") ON DELETE SET NULL ON UPDATE CASCADE;
