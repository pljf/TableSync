import { prisma } from "../src/lib/prisma";
import { dishCatalog, ingredients } from "../src/lib/seed-data";

async function seedCatalog() {
  for (const ingredient of Object.values(ingredients)) {
    await prisma.ingredient.upsert({
      where: {
        id: ingredient.id
      },
      update: {
        name: ingredient.name,
        category: ingredient.category,
        defaultUnit: ingredient.defaultUnit,
        tags: ingredient.tags
      },
      create: ingredient
    });
  }

  for (const dish of dishCatalog) {
    const dishData = {
      name: dish.name,
      description: dish.description,
      category: dish.category,
      cuisine: dish.cuisine,
      baseServings: dish.baseServings,
      estimatedCostCents: dish.estimatedCostCents,
      prepTimeMinutes: dish.prepTimeMinutes,
      spiceLevel: dish.spiceLevel,
      spiceAdjustable: dish.spiceAdjustable,
      supportedEventTypes: dish.supportedEventTypes,
      hotpotRole: dish.hotpotRole,
      tags: dish.tags
    };
    const ingredientRows = dish.ingredients.map((item) => ({
      ingredientId: item.ingredient.id,
      quantity: item.quantity,
      unit: item.unit
    }));

    await prisma.dish.upsert({
      where: {
        id: dish.id
      },
      update: {
        ...dishData,
        ingredients: {
          deleteMany: {},
          create: ingredientRows
        }
      },
      create: {
        id: dish.id,
        ...dishData,
        ingredients: {
          create: ingredientRows
        }
      }
    });
  }
}

async function main() {
  await seedCatalog();
  console.log("Seeded TableSync ingredient and dish catalog.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
