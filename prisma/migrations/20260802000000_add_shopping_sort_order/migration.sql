-- Preserve deterministic shopping order across createMany writes and reloads.
ALTER TABLE "ShoppingItem"
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
