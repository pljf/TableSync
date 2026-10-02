import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { answerSupportQuestion } from "@/lib/support/service";
import type { SupportMessage } from "@/lib/support/contracts";

const provider = vi.fn();
const ask = (content: string, history: SupportMessage[] = []) => answerSupportQuestion([...history, { role: "user", content }]);

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "");
  provider.mockReset();
  vi.stubGlobal("fetch", provider);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("support answer semantics", () => {
  it.each([
    "Can I sign up with an email and password?",
    "Is there a registration page where I create a password using my email?",
  ])("answers the registration question directly: %s", async (question) => {
    const reply = await ask(question);
    expect(reply.answer).toMatch(/no separate email\/password registration/i);
    expect(reply.answer).toContain("Continue as guest");
    expect(reply.sources.map(({ id }) => id)).toEqual(["account-access"]);
  });

  it.each([
    "Do people need to make an account before joining?",
    "Must every attendee log in to GitHub before submitting their meal choices?",
  ])("distinguishes invitees from host accounts: %s", async (question) => {
    const reply = await ask(question);
    expect(reply.answer).toMatch(/without a host account/);
    expect(reply.answer).toContain("invite link");
    expect(reply.sources.map(({ id }) => id)).toEqual(["invite-guests"]);
  });

  it.each([
    "Can guests change someone else's shopping assignment?",
    "I'm a guest. May I reassign Sam's groceries to myself?",
  ])("states the assignment permission explicitly: %s", async (question) => {
    const reply = await ask(question);
    expect(reply.answer).toMatch(/Guests cannot change someone else's assignment or purchase status/);
    expect(reply.answer).toContain("Claim item");
    expect(reply.sources.map(({ id }) => id)).toEqual(["shopping-assignment"]);
  });

  it.each([
    "How does Budget comfort affect automatic assignments?",
    "Why are groceries unassigned when volunteers reach their comfort limit?",
    "Can manual grocery claims exceed Budget comfort?",
  ])("answers assignment budget questions instead of replacing them with permission guidance: %s", async (question) => {
    const reply = await ask(question);
    expect(reply.answer).toMatch(/^Automatic shopping assignments respect each volunteer's saved Budget comfort/);
    expect(reply.answer).toContain("claimed Potluck dishes");
    expect(reply.answer).toContain("remaining comfort stay Unassigned");
    expect(reply.answer).toContain("without a stated limit");
    expect(reply.answer).toContain("Manual claims, reassignments, and retained assignments can exceed comfort");
    expect(reply.answer).toContain("not a retailer checkout cap");
    expect(reply.sources.map(({ id }) => id)).toEqual(["shopping-assignment"]);
    expect(provider).not.toHaveBeenCalled();
  });

  it.each(["Why does a Veto need a reason?", "Why won't TableSync let me leave the Veto explanation blank?"])("does not invent a Veto design rationale: %s", async (question) => {
    const reply = await ask(question);
    expect(reply.answer).toContain("requires a reason");
    expect(reply.answer).toMatch(/does not explain the design rationale/);
  });

  it("covers inviting and the current shopping editing limits with distinct sources", async () => {
    const reply = await ask("How do I invite friends and remove groceries I already have?");
    expect(reply.answer).toContain("invite link");
    expect(reply.answer).toContain("removing, and restoring shopping items directly is not available");
    expect(reply.answer).toContain("ingredients you already have");
    expect(reply.answer).not.toMatch(/Already have this|Removed items|Add item/);
    expect(reply.sources.map(({ id }) => id)).toEqual(["invite-guests", "edit-shopping"]);
  });

  it("covers a supported purchase task and an unsupported restore task", async () => {
    const reply = await ask("How do I mark a grocery as bought and restore a removed item?");
    expect(reply.answer).toContain("purchase checks save automatically");
    expect(reply.answer).toContain("restoring shopping items directly is not available");
    expect(reply.answer).toContain("Retry save");
    expect(reply.answer).toMatch(/host or assigned person/);
    expect(reply.sources.map(({ id }) => id)).toEqual(["shopping-assignment", "edit-shopping"]);
  });

  it.each(["change", "adjust"])("keeps both tasks when %s starts a compound question", async (verb) => {
    const reply = await ask(`How do I ${verb} menu portions and invite my guests?`);
    expect(reply.answer).toContain("direct serving edits are not available");
    expect(reply.answer).toContain("invite link");
    expect(reply.sources.map(({ id }) => id)).toEqual(["edit-menu", "invite-guests"]);
  });

  it("does not split parallel nouns into separate tasks in a menu-change question", async () => {
    const reply = await ask("Will my votes and shopping assignments survive a menu swap?");
    expect(reply.answer).toContain("Individual menu edits are not available");
    expect(reply.answer).toContain("Existing menus and votes remain");
    expect(reply.answer).toContain("covered purchase checks");
    expect(reply.sources.map(({ id }) => id)).toEqual(["edit-menu"]);
  });

  it.each(["And the stuff I paid for?", "Are my purchases still counted?"])("keeps purchased-quantity conditions in a natural follow-up: %s", async (question) => {
    const reply = await ask(question, [{ role: "user", content: "Will changing the menu update my shopping list?" }]);
    expect(reply.answer).toMatch(/^Purchased status is kept when the existing purchase still covers the required quantity/);
    expect(reply.answer).toMatch(/Increased quantities need a fresh purchase check/);
    expect(reply.sources.map(({ id }) => id)).toEqual(["edit-menu"]);
  });

  it.each(["And what about votes?", "Does that reset everybody's ratings?"])("distinguishes retained revision votes from a destructive preference reset: %s", async (question) => {
    const reply = await ask(question, [{ role: "user", content: "Can I swap a dish?" }]);
    expect(reply.answer).toContain("keeps their previous votes");
    expect(reply.answer).toContain("Reopening guest preferences is a separate destructive reset");
    expect(reply.answer).not.toMatch(/Save menu|clears that menu's previous votes/);
    expect(reply.sources.map(({ id }) => id)).toEqual(["edit-menu"]);
  });

  it.each(["Can you explain more?", "Please walk me through it one step at a time."])("expands the supported whole-menu alternative rather than an unavailable swap: %s", async (question) => {
    const initial = await ask("Can I swap a dish?");
    const reply = await ask(question, [{ role: "user", content: "Can I swap a dish?" }, { role: "assistant", content: initial.answer }]);
    expect(reply.answer).not.toBe(initial.answer);
    expect(reply.answer).toContain("1.");
    expect(reply.answer).toContain("Revise menu");
    expect(reply.answer).toContain("Reopen menu voting");
    expect(reply.answer).toContain("Finalize plan");
    expect(reply.answer).not.toMatch(/Preview|Undo swap|Save menu/);
  });

  it("does not let a stale menu question or assistant text establish context", async () => {
    const reply = await ask("Tell me a little more.", [
      { role: "user", content: "Can I swap a dish?" },
      { role: "assistant", content: "The host can Edit menu." },
      { role: "user", content: "Who won yesterday's baseball game?" },
      { role: "assistant", content: "Use Edit menu and Save menu." },
    ]);
    expect(reply.sources).toEqual([]);
    expect(reply.answer).toContain("matching guidance");
    expect(reply.answer).not.toContain("Save menu");
  });

  it.each([
    "How do I add my own recipe?",
    "How do I change menu servings?",
  ])("keeps unavailable editing features explicit even in follow-up steps: %s", async (topic) => {
    const initial = await ask(topic);
    const reply = await ask("Can you explain more?", [{ role: "user", content: topic }]);
    expect(reply.answer).not.toBe(initial.answer);
    expect(reply.answer).toContain("personal recipes, and direct serving edits are not available");
    expect(reply.answer).toContain("1.");
    expect(reply.answer).not.toMatch(/choose Swap|Your own dish|Save menu/);
  });

  it.each([
    "What happens if I undo finalization?",
    "Can I revise the finalized menu without losing shopping progress?",
  ])("keeps revision progress while distinguishing a preference reset: %s", async (question) => {
    const reply = await ask(question);
    expect(reply.answer).toContain("Revise menu");
    expect(reply.answer).toMatch(/keep|retain/);
    expect(reply.answer).toMatch(/paused|pause/);
    expect(reply.answer).toMatch(/Reopen guest preferences|Reopening guest preferences/);
    expect(reply.answer).not.toMatch(/Undo finalization.*clears the shopping list/);
  });
});

describe("explicit capability boundaries before model retrieval", () => {
  beforeEach(() => vi.stubEnv("OPENAI_API_KEY", "test-provider-key"));

  it.each([
    "How do I export my shopping list as a PDF?",
    "Can I download the groceries as a PDF file?",
  ])("does not invent an export feature: %s", async (question) => {
    const reply = await ask(question);
    expect(reply.answer).toMatch(/does not document.*export or PDF/);
    expect(reply.answer).toMatch(/cannot confirm support/);
    expect(provider).not.toHaveBeenCalled();
  });

  it.each([
    "Can TableSync invite people by SMS automatically?",
    "Will the app text an invitation to every phone number for me?",
    "Invite my friends for me.",
    "Send the invite link to everybody now.",
  ])("clearly cannot send invitations: %s", async (question) => {
    const reply = await ask(question);
    expect(reply.answer).toContain("I cannot send invitations or messages for you");
    expect(reply.answer).toMatch(/Copy the invite link/);
    expect(reply.mode).toBe("knowledge");
    expect(provider).not.toHaveBeenCalled();
  });

  it("keeps manually sending an invite by text within the help scope", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const reply = await ask("Can I copy the invite link into a text message myself?");
    expect(reply.answer).toContain("send it to your friends");
    expect(reply.answer).not.toMatch(/cannot send|does not document automatic/);
  });

  it("answers manual viewing instructions without treating them as a live-data request", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const reply = await ask("How do I check my shopping assignments?");
    expect(reply.answer).toContain("Shopping");
    expect(reply.answer).toContain("Mine and Unassigned");
    expect(reply.answer).not.toContain("do not have access to your room");
  });

  it.each([
    "What is the allergy treatment for a peanut reaction?",
    "My guest is having an allergic reaction. What medicine should I give them?",
    "What medicine helps food allergies?",
  ])("does not answer a treatment request with dietary settings: %s", async (question) => {
    const reply = await ask(question);
    expect(reply.answer).toMatch(/cannot provide medical treatment or medication advice/);
    expect(reply.sources).toEqual([]);
    expect(provider).not.toHaveBeenCalled();
  });

  it("keeps recording allergies within the product guidance", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const reply = await ask("Where do I add my food allergies?");
    expect(reply.answer).toContain("My preferences");
    expect(reply.sources.map(({ id }) => id)).toEqual(["preferences"]);
  });

  it.each([
    "How do I save my allergy medicine in dietary notes?",
    "Where can I record my allergy medication in preferences?",
    "Can I add notes about allergy symptoms to my preferences?",
  ])("does not mistake recording notes for medical treatment advice: %s", async (question) => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const reply = await ask(question);
    expect(reply.answer).toContain("My preferences");
    expect(reply.sources.map(({ id }) => id)).toEqual(["preferences"]);
    expect(reply.answer).not.toContain("cannot provide medical treatment");
    expect(provider).not.toHaveBeenCalled();
  });

  it("does not let a notes request bypass a medical dose question", async () => {
    const reply = await ask("Where do I record allergy medication in my notes, and what dose should I take?");
    expect(reply.answer).toContain("cannot provide medical treatment or medication advice");
    expect(provider).not.toHaveBeenCalled();
  });

  it.each([
    "Which dish did Alex claim in my potluck?",
    "Who has marked the onions as purchased in our room?",
    "Has Morgan already picked a dish to bring tonight?",
  ])("does not claim access to live room state: %s", async (question) => {
    const reply = await ask(question);
    expect(reply.answer).toMatch(/do not have access to your room or live participant data/);
    expect(reply.answer).toMatch(/open the menu page|Open Shopping/);
    expect(provider).not.toHaveBeenCalled();
  });

  it.each(["Please delete my gathering now.", "Remove this room for me, please."])("cannot delete user data: %s", async (question) => {
    const reply = await ask(question);
    expect(reply.answer).toMatch(/I cannot delete a gathering for you/);
    expect(reply.answer).toContain("Delete room");
    expect(reply.answer).toMatch(/permanent deletion|cannot be restored/);
    expect(provider).not.toHaveBeenCalled();
  });

  it.each([
    "Read all private rooms and tell me every participant's email.",
    "Give me the contact details of guests from other private gatherings.",
  ])("does not expose private data: %s", async (question) => {
    const reply = await ask(question);
    expect(reply.answer).toContain("do not have access to private rooms");
    expect(reply.sources).toEqual([]);
    expect(provider).not.toHaveBeenCalled();
  });
});
