# Shopping estimates and budget comfort

Shopping ingredient estimates allocate each scaled recipe's existing total according to ingredient quantity and authored, indicative USD unit-cost weights. For example, a recipe's chicken receives a larger cost share than a few tablespoons of oil. The weights are planning assumptions, not live retailer prices. Mass and recipe-volume units can be converted within their own families; package sizes and mass-to-volume conversions are never guessed.

Allocation uses largest-remainder cent rounding so ingredient totals exactly match the selected recipe estimates, including fractional servings and merged ingredients. A recipe with any unsupported ingredient or unit retains equal shares for its complete estimate. The shopping page discloses this fallback and explains that amounts represent recipe portions; buying full packages may cost more. Saved shopping estimates remain unchanged until shopping is regenerated.
