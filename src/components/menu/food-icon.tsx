import Image from "next/image";
import { Utensils } from "lucide-react";
import type { Dish } from "@/lib/domain";
import { dishIllustrationSrc } from "@/lib/dish-illustrations";

export function FoodIcon({ dish, compact = false }: {
  dish: Pick<Dish, "id" | "category" | "hotpotRole">;
  compact?: boolean;
}) {
  const src = dishIllustrationSrc(dish.id);
  const size = compact ? 44 : 64;

  return (
    <span aria-hidden="true" className={`food-icon${compact ? " food-icon-compact" : ""}`}>
      {src ? (
        <Image src={src} alt="" width={size} height={size} sizes={`${size}px`} className="food-illustration" />
      ) : (
        <Utensils size={compact ? 20 : 28} strokeWidth={1.7} focusable="false" />
      )}
    </span>
  );
}
