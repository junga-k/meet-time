-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delegateUserId" TEXT,
    "role" TEXT NOT NULL,
    "confirmationStatus" TEXT NOT NULL DEFAULT '미확인',
    "attendanceMode" TEXT DEFAULT '대면',
    "respondedAt" DATETIME,
    "declineReason" TEXT,
    "reconfirmedAt" DATETIME,
    CONSTRAINT "Participant_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Participant_delegateUserId_fkey" FOREIGN KEY ("delegateUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Participant" ("attendanceMode", "confirmationStatus", "declineReason", "delegateUserId", "id", "meetingId", "reconfirmedAt", "respondedAt", "role", "userId") SELECT "attendanceMode", "confirmationStatus", "declineReason", "delegateUserId", "id", "meetingId", "reconfirmedAt", "respondedAt", "role", "userId" FROM "Participant";
DROP TABLE "Participant";
ALTER TABLE "new_Participant" RENAME TO "Participant";
CREATE UNIQUE INDEX "Participant_meetingId_userId_key" ON "Participant"("meetingId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
