import Image from "next/image";
import { CakeSlice, Carrot, CookingPot, CupSoda, Salad, Soup, Utensils, Wheat } from "lucide-react";
import type { Dish } from "@/lib/domain";
import { dishPhotography } from "@/lib/dish-photography";

export function FoodIcon({ dish, compact = false }: {
  dish: Pick<Dish, "id" | "category" | "hotpotRole">;
  compact?: boolean;
}) {
  const photo = dishPhotography(dish.id);
  const size = compact ? 44 : 64;
  const Icon = dish.hotpotRole
    ? { BROTH: Soup, PROTEIN: Utensils, VEGETABLE: Carrot, STAPLE: Wheat, SAUCE: Soup, DRINK: CupSoda }[dish.hotpotRole]
    : { MAIN: CookingPot, SIDE: Salad, APPETIZER: Carrot, DESSERT: CakeSlice, DRINK: CupSoda, SAUCE: Soup }[dish.category];

  return (
    <span aria-hidden="true" className={`food-icon${compact ? " food-icon-compact" : ""}`}>
      {photo ? (
        <Image src={photo.src} alt="" width={size} height={size} sizes={`${size}px`} className="food-photograph" />
      ) : (
        <Icon size={compact ? 20 : 28} strokeWidth={1.5} focusable="false" />
      )}
    </span>
  );
}
