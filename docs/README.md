# Documentation

Start with the [project overview](../README.md), then choose the guide for your task.

| Guide | Contents |
| --- | --- |
| [Development](development.md) | Local setup, environment variables, commands, and architecture |
| [User guide](user-guide.md) | Guest access, rooms, menus, voting, shopping, and room expiry |
| [Interface design](design/editorial-ui.md) | Current layouts, motion, accessibility, and photography |
| [Meal formats](product/EVENT_FORMAT_EXPANSION.md) | Menu structures and Potluck contribution rules, with dated acceptance evidence |
| [Operations runbook](deployment/STAGING_OPERATIONS_RUNBOOK.md) | Managed database setup, staging acceptance, recovery, and maintenance |
| [Runtime settings](deployment/runtime.env.example) | Hosting environment template |
| [Acceptance settings](deployment/acceptance.env.example) | Protected CI job environment template |
| [Room retention](deployment/room-retention.md) | Seven-day expiry and scheduled cleanup |
| [Acceptance report template](deployment/STAGING_ACCEPTANCE_REPORT.md) | Record results for a staging acceptance run |

## Supporting material

- [Product images](images/): selected website screenshots used in the project README.
- [Evidence](evidence/): retained audit summaries, reports, and representative screenshots. These paths are also used by verification scripts and CI.
- [Archive](archive/README.md): development log, original plans, and dated reviews. Their status statements describe past work and are not the current deployment status.

## Keeping the repository organized

Keep the root README focused on the product and getting started. Put maintained guides here, operational instructions in `deployment/`, and product contracts in `product/`. Add development history to `archive/`, with plans in `archive/plans/` and reviews in `archive/reviews/`.

Runtime logs, local screenshots, build output, and test reports are already excluded by `.gitignore`. Retain only intentional, redacted evidence in `evidence/`; never include secrets, raw session data, or database dumps.
