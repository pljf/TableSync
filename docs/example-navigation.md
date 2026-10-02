# Example navigation

The interactive example keeps both **My gatherings** links inside the example dashboard. Its header and dashboard **New gathering** links open the example form. The explicit **Start your own gathering** link opens the real creation flow.

At widths up to 420px, the four example section links use two rows so each stays visible and operable. This preserves keyboard navigation and does not hide a section. Grocery filters may wrap as needed. The example still uses sample data; changes survive switching its sections and reset when leaving the example.

Browser regressions cover 320px overflow, keyboard activation, both dashboard entrypoints, example creation, grocery filters, assignments and purchase state across sections. Physical-device gestures remain outside automated viewport checks.

The shopping progress caption uses a darker green to meet text contrast requirements on the existing pale-green surface.

Assignment-complete feedback depends on the whole list. A search with no matches does not claim all groceries are assigned.
