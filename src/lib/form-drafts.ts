type DraftOption = { selected: boolean; defaultSelected: boolean; disabled: boolean };
type DraftControl = {
  tagName: string;
  name?: string;
  type?: string;
  value?: string;
  defaultValue?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  multiple?: boolean;
  options?: Iterable<DraftOption>;
  getAttribute: (name: string) => string | null;
};

/** Controlled fields declare their saved baseline; native fields keep defaults. */
export function hasUnsavedFormControls(controls: Iterable<DraftControl>): boolean {
  return Array.from(controls).some((control) => {
    if (!control.name || ["hidden", "submit", "button", "reset"].includes(control.type ?? "")) return false;
    const marked = control.getAttribute("data-dirty");
    if (marked !== null) return marked === "true";
    if (control.tagName === "INPUT") {
      if (control.type === "checkbox" || control.type === "radio") return control.checked !== control.defaultChecked;
      return control.value !== control.defaultValue;
    }
    if (control.tagName === "TEXTAREA") return control.value !== control.defaultValue;
    if (control.tagName === "SELECT") {
      const options = Array.from(control.options ?? []);
      if (control.multiple) return options.some((option) => option.selected !== option.defaultSelected);
      // A native single select defaults to its last explicitly selected option,
      // or its first enabled option when no selected attribute is present.
      const explicitDefault = options.reduce((last, option, index) => option.defaultSelected ? index : last, -1);
      const defaultIndex = explicitDefault >= 0 ? explicitDefault : options.findIndex((option) => !option.disabled);
      return options.findIndex((option) => option.selected) !== defaultIndex;
    }
    return false;
  });
}
