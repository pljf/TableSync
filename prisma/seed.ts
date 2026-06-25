import type { MenuPlan, VoteValue } from "../src/lib/domain";
import { generateMenuPlans } from "../src/lib/menu-engine/generate-menu-plans";
import { prisma } from "../src/lib/prisma";
import { demoGuests, demoHost, demoRoom, dishCatalog, ingredients } from "../src/lib/seed-data";
import { generateShoppingList } from "../src/lib/shopping-engine/generate-shopping-list";
import type { Prisma } from "../src/generated/prisma/client";

const voteValues: VoteValue[][] = [
  ["LIKE", "LIKE", "NEUTRAL", "LIKE", "LIKE", "NEUTRAL"],
  ["NEUTRAL", "LIKE", "NEUTRAL", "NEUTRAL", "LIKE", "VETO"],
  ["LIKE", "NEUTRAL", "LIKE", "NEUTRAL", "NEUTRAL", "LIKE"]
];

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

async function seedDemoRoom() {
  await prisma.user.upsert({
    where: {
      email: demoHost.email
    },
    update: {
      name: demoHost.name
    },
    create: demoHost
  });

  await prisma.dinnerRoom.deleteMany({
    where: {
      id: demoRoom.id
    }
  });

  await prisma.dinnerRoom.create({
    data: {
      id: demoRoom.id,
      hostId: demoRoom.hostId,
      title: demoRoom.title,
      description: demoRoom.description,
      eventType: demoRoom.eventType,
      dateTime: demoRoom.dateTime ? new Date(demoRoom.dateTime) : null,
      location: demoRoom.location,
      totalBudgetCents: demoRoom.totalBudgetCents,
      expectedGuests: demoRoom.expectedGuests,
      status: demoRoom.status,
      inviteToken: demoRoom.inviteToken,
      isPublicShareable: demoRoom.isPublicShareable,
      createdAt: new Date(demoRoom.createdAt),
      updatedAt: new Date(demoRoom.updatedAt)
    }
  });

  for (const guest of demoGuests) {
    await prisma.guest.create({
      data: {
        id: guest.id,
        roomId: guest.roomId,
        name: guest.name,
        email: guest.email,
        editToken: guest.editToken,
        isHostGuest: guest.isHostGuest,
        canBring: guest.canBring,
        createdAt: new Date(guest.createdAt),
        updatedAt: new Date(guest.updatedAt),
        preference: {
          create: {
            id: guest.preference.id,
            dietType: guest.preference.dietType,
            allergies: guest.preference.allergies,
            dislikes: guest.preference.dislikes,
            likes: guest.preference.likes,
            spiceLevel: guest.preference.spiceLevel,
            maxBudgetCents: guest.preference.maxBudgetCents,
            notes: guest.preference.notes
          }
        }
      }
    });
  }

  const generated = generateMenuPlans({
    room: demoRoom,
    guests: demoGuests,
    dishes: dishCatalog
  });
  const plans: MenuPlan[] = [];

  for (const [index, generatedPlan] of generated.entries()) {
    const planId = `plan-demo-${index + 1}`;
    const plan = await prisma.menuPlan.create({
      data: {
        id: planId,
        roomId: demoRoom.id,
        title: generatedPlan.title,
        summary: generatedPlan.summary,
        score: generatedPlan.score,
        estimatedCostCents: generatedPlan.estimatedCostCents,
        status: index === 0 ? "FINALIZED" : "PROPOSED",
        warnings: generatedPlan.warnings as unknown as Prisma.InputJsonValue,
        createdAt: new Date(demoRoom.createdAt),
        updatedAt: new Date(demoRoom.updatedAt),
        dishes: {
          create: generatedPlan.dishes.map((item) => ({
            dishId: item.dish.id,
            servings: item.servings
          }))
        },
        votes: {
          create: demoGuests.map((guest, guestIndex) => {
            const value = voteValues[index]?.[guestIndex] ?? "NEUTRAL";
            return {
              id: `vote-${planId}-${guest.id}`,
              guestId: guest.id,
              value,
              reason: value === "VETO" ? "Not the best fit for my restriction." : undefined,
              createdAt: new Date(demoRoom.createdAt),
              updatedAt: new Date(demoRoom.createdAt)
            };
          })
        }
      }
    });

    plans.push({
      ...generatedPlan,
      id: plan.id,
      roomId: plan.roomId,
      status: plan.status,
      votes: [],
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString()
    });
  }

  const finalPlan = plans[0];
  if (finalPlan) {
    const shopping = generateShoppingList({
      room: demoRoom,
      guests: demoGuests,
      plan: finalPlan
    });

    await prisma.shoppingItem.createMany({
      data: shopping.map((item, index) => ({
        id: `shopping-demo-${index + 1}`,
        roomId: demoRoom.id,
        ingredientId: item.ingredient.id,
        quantity: item.quantity,
        unit: item.unit,
        estimatedCostCents: item.estimatedCostCents,
        assignedToGuestId: item.assignedToGuestId,
        checked: index < 3,
        createdAt: new Date(demoRoom.createdAt),
        updatedAt: new Date(demoRoom.updatedAt)
      }))
    });
  }

  await prisma.activityEvent.createMany({
    data: [
      {
        roomId: demoRoom.id,
        actorName: "Pat Host",
        type: "ROOM_CREATED",
        message: "Created Friday Hotpot Night.",
        createdAt: new Date(demoRoom.createdAt)
      },
      {
        roomId: demoRoom.id,
        actorName: "Guests",
        type: "GUEST_JOINED",
        message: "Six guests submitted preferences.",
        createdAt: new Date(demoRoom.createdAt)
      },
      {
        roomId: demoRoom.id,
        actorName: "TableSync",
        type: "PLANS_GENERATED",
        message: "Generated three safe menu plans.",
        createdAt: new Date(demoRoom.createdAt)
      },
      {
        roomId: demoRoom.id,
        actorName: "Pat Host",
        type: "PLAN_FINALIZED",
        message: "Finalized the top scoring plan.",
        createdAt: new Date(demoRoom.createdAt)
      },
      {
        roomId: demoRoom.id,
        actorName: "TableSync",
        type: "SHOPPING_GENERATED",
        message: "Generated and assigned the shopping list.",
        createdAt: new Date(demoRoom.createdAt)
      }
    ]
  });
}

async function main() {
  await seedCatalog();
  await seedDemoRoom();
  console.log("Seeded TableSync catalog and Friday Hotpot Night demo room.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
