-- Give menu generation explicit event compatibility and Hotpot component roles.
CREATE TYPE "HotpotRole" AS ENUM ('BROTH', 'PROTEIN', 'VEGETABLE', 'STAPLE', 'SAUCE', 'DRINK');

ALTER TABLE "Dish"
ADD COLUMN "supportedEventTypes" "EventType"[] NOT NULL DEFAULT ARRAY['DINNER']::"EventType"[],
ADD COLUMN "hotpotRole" "HotpotRole";

-- Preserve the original Hotpot broth as Hotpot-only data.
UPDATE "Dish"
SET "supportedEventTypes" = ARRAY['HOTPOT']::"EventType"[],
    "hotpotRole" = 'BROTH'
WHERE "id" = 'mushroom-hotpot-broth';

-- Shared staples and drinks can participate in either supported workflow.
UPDATE "Dish"
SET "supportedEventTypes" = ARRAY['DINNER', 'HOTPOT']::"EventType"[],
    "hotpotRole" = CASE
      WHEN "category" = 'DRINK' THEN 'DRINK'::"HotpotRole"
      ELSE 'STAPLE'::"HotpotRole"
    END
WHERE "id" IN ('steamed-rice', 'sparkling-water', 'lemonade', 'iced-tea');
