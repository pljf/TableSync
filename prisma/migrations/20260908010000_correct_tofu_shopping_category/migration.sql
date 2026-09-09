-- Tofu belongs with refrigerated plant foods, not dairy. Existing shopping
-- lists reference this catalog row, so correcting it preserves their progress.
UPDATE "Ingredient"
SET "category" = 'PRODUCE'
WHERE "id" = 'tofu' AND "category" = 'DAIRY';
