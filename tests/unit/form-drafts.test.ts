import { describe, expect, it } from "vitest";
import { hasUnsavedFormControls } from "@/lib/form-drafts";

const input = (changes = {}) => ({
  tagName: "INPUT", name: "confirmation", type: "checkbox", checked: false, defaultChecked: false,
  getAttribute: () => null as string | null,
  ...changes
});
const select = (options: { selected: boolean; defaultSelected: boolean; disabled: boolean }[], multiple = false) => ({
  tagName: "SELECT", name: "choice", options, multiple, getAttribute: () => null
});

describe("saved form draft detection", () => {
  it("clears a canceled native confirmation without needing controlled-field markers", () => {
    const confirmation = input();
    expect(hasUnsavedFormControls([confirmation])).toBe(false);
    confirmation.checked = true;
    expect(hasUnsavedFormControls([confirmation])).toBe(true);
    confirmation.checked = false;
    expect(hasUnsavedFormControls([confirmation])).toBe(false);
  });

  it("recognizes reverting native text, textarea and radio edits", () => {
    const text = input({ type: "text", value: "Saved", defaultValue: "Saved" });
    const notes = input({ tagName: "TEXTAREA", type: "textarea", value: "Old note", defaultValue: "Old note" });
    const radio = input({ type: "radio", checked: true, defaultChecked: true });
    expect(hasUnsavedFormControls([text, notes, radio])).toBe(false);
    expect(hasUnsavedFormControls([{ ...text, value: "New" }, notes, radio])).toBe(true);
    expect(hasUnsavedFormControls([text, { ...notes, value: "New note" }, radio])).toBe(true);
    expect(hasUnsavedFormControls([text, notes, { ...radio, checked: false }])).toBe(true);
    expect(hasUnsavedFormControls([text, notes, radio])).toBe(false);
  });

  it("uses explicit controlled-field dirty state without ignoring native fields in that form", () => {
    const saved = input({ type: "text", value: "Different DOM default", defaultValue: "Old", getAttribute: () => "false" });
    expect(hasUnsavedFormControls([saved])).toBe(false);
    expect(hasUnsavedFormControls([{ ...saved, getAttribute: () => "true" }])).toBe(true);
    expect(hasUnsavedFormControls([saved, input({ checked: true })])).toBe(true);
  });

  it("compares explicit saved selections and restored multiple selections", () => {
    const options = [
      { selected: true, defaultSelected: true, disabled: false },
      { selected: false, defaultSelected: false, disabled: false }
    ];
    expect(hasUnsavedFormControls([select(options)])).toBe(false);
    expect(hasUnsavedFormControls([select(options.map((option) => ({ ...option, selected: !option.selected })))] )).toBe(true);
    expect(hasUnsavedFormControls([select(options, true)])).toBe(false);
    expect(hasUnsavedFormControls([select(options.map((option) => ({ ...option, selected: true })), true)])).toBe(true);
  });

  it("recognizes a single select's implicit first enabled option", () => {
    const options = [
      { selected: false, defaultSelected: false, disabled: true },
      { selected: true, defaultSelected: false, disabled: false }
    ];
    expect(hasUnsavedFormControls([select(options)])).toBe(false);
    expect(hasUnsavedFormControls([select(options.map((option) => ({ ...option, selected: !option.selected })))] )).toBe(true);
  });

  it("ignores hidden action identifiers, submit buttons and unnamed controls", () => {
    const changed = { value: "new", defaultValue: "old" };
    expect(hasUnsavedFormControls([
      input({ ...changed, type: "hidden" }), input({ ...changed, type: "submit" }), input({ ...changed, type: "text", name: "" })
    ])).toBe(false);
  });
});
