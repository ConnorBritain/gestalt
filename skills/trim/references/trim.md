# Trim moves

| Move | When | Saves | Undo |
|---|---|---|---|
| **Remove** | Never used, serves no goal, duplicates a slot | Its whole listing, every turn, everywhere | Reinstall |
| **Disable in a context** | Used, but only in one kind of repo | Its listing in every other context | Delete the `disable:` line |
| **Move to a headless worker** | Heavy (many skills or MCP tools), used occasionally, no hook the lead needs | Its listing and MCP in the lead; it runs on a cheaper tier | Remove the worker |
| **Demote mode** | A protocol rule for something that is not a reviewer | One always-on block line | Restore `mode: protocol` |
| **Sharpen description** | Survey flags an aggressive trigger, or it fires on the wrong prompts | Misroutes (not tokens) | Revert the description, upstream |
| **Keep** | A gate or reviewer the way depends on, or used weekly | Nothing | — |

Rules:

- Never cut a gate to make a number smaller. A critic used twice a week that catches one
  real problem a month is worth its listing.
- A plugin whose hooks the lead relies on (orienters, Stop gates) cannot become a headless
  worker: its hooks would leave the lead's session. Disable it by context instead.
- Prefer disabling by context to removing: it is the most reversible move.
- Org-synced plugins (Cowork) may not be removable by the person; say so and propose a
  context disable or ask their admin.
- Each cut names its add-back signal ("if you find yourself typing the same five-step
  release checklist again, bring back the release skill").
