# kitctl gaps

What kitctl needs from you before these loadouts apply. `kitctl validate` names any primitive missing from your warehouse.

- app: loadout "app-studio" is referenced, not generated; it must exist in the warehouse.
- site: loadout "brand-studio" is referenced, not generated; it must exist in the warehouse.
- plugin:ui-magic: its warehouse primitive must list `ui.generator` under provides (gestalt-app assigns it that slot).
- plugin:brand-builder: its warehouse primitive must list `design.generator` under provides (gestalt-site assigns it that slot).
- cursor: kitctl does not target Cursor; SETUP.md lists the manual steps.
