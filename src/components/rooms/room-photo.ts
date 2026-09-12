import type { EventType } from "@/lib/domain";
import { photoForDish } from "@/lib/photo-library";

const occasionPhotos: Record<EventType, string> = {
  DINNER: "shared-table",
  HOTPOT: "mushroom-hotpot-broth",
  POTLUCK: "vegetarian-pasta-bake",
  BBQ: "bbq-chicken-skewers",
  PICNIC: "picnic-lentil-wraps",
  BRUNCH: "brunch-avocado-bean-toast",
  OTHER: "table-preparation"
};

/** An occasion photograph, independent of a room's actual menu or guests. */
export function roomPhoto(eventType: EventType) {
  return photoForDish(occasionPhotos[eventType]);
}
