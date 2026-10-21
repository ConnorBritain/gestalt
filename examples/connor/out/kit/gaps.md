# kitctl gaps

What kitctl needs from you before these loadouts apply. `kitctl validate` names any primitive missing from your warehouse.

- app: loadout "app-studio" is referenced, not generated; it must exist in the warehouse.
- site: loadout "brand-studio" is referenced, not generated; it must exist in the warehouse.
- plugin:ui-magic: its warehouse primitive must list `ui.generator` under provides (gestalt-app assigns it that slot).
- plugin:brand-builder: its warehouse primitive must list `design.generator` under provides (gestalt-site assigns it that slot).
- cursor: kit.yaml leaves cursor out of harnesses until you add it; kitctl's Cursor facts are unverified, so check the first repo by hand (SETUP.md §6).
