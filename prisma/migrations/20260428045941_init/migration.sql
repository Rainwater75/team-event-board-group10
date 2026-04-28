-- CreateTable
CREATE TABLE "Event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'None',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "maxCapacity" INTEGER NOT NULL,
    "organizerId" TEXT NOT NULL,
    "organizerName" TEXT
);
