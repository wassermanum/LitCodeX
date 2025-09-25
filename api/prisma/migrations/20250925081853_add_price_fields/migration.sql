-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Literature" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Literature" ("createdAt", "id", "sortOrder", "title", "type", "updatedAt") SELECT "createdAt", "id", "sortOrder", "title", "type", "updatedAt" FROM "Literature";
DROP TABLE "Literature";
ALTER TABLE "new_Literature" RENAME TO "Literature";
CREATE INDEX "Literature_sortOrder_idx" ON "Literature"("sortOrder");
CREATE UNIQUE INDEX "Literature_type_title_key" ON "Literature"("type", "title");
CREATE TABLE "new_OrderItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "literatureId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_literatureId_fkey" FOREIGN KEY ("literatureId") REFERENCES "Literature" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_OrderItem" ("createdAt", "id", "literatureId", "orderId", "quantity", "updatedAt") SELECT "createdAt", "id", "literatureId", "orderId", "quantity", "updatedAt" FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";
CREATE UNIQUE INDEX "OrderItem_orderId_literatureId_key" ON "OrderItem"("orderId", "literatureId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
