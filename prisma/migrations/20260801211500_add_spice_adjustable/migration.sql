-- Distinguish dishes whose heat can be served separately from intrinsically spicy dishes.
ALTER TABLE "Dish" ADD COLUMN "spiceAdjustable" BOOLEAN NOT NULL DEFAULT false;
