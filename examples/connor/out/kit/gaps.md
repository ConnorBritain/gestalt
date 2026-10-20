# kitctl gaps

What kitctl needs before these loadouts apply cleanly.

- app: loadout "app-studio" is referenced, not generated; it must exist in the warehouse.
- site: loadout "brand-studio" is referenced, not generated; it must exist in the warehouse.
- mcp:github: needs a primitive in the warehouse (primitives/<kind>/<name>.yaml) before kitctl validate passes.
- mcp:linear: needs a primitive in the warehouse (primitives/<kind>/<name>.yaml) before kitctl validate passes.
- mcp:m365: needs a primitive in the warehouse (primitives/<kind>/<name>.yaml) before kitctl validate passes.
- plugin:anthropic/frontend-design: needs a primitive in the warehouse (primitives/<kind>/<name>.yaml) before kitctl validate passes.
- plugin:brand-builder: needs a primitive in the warehouse (primitives/<kind>/<name>.yaml) before kitctl validate passes.
- plugin:cairn: needs a primitive in the warehouse (primitives/<kind>/<name>.yaml) before kitctl validate passes.
- plugin:compounder: needs a primitive in the warehouse (primitives/<kind>/<name>.yaml) before kitctl validate passes.
- plugin:elonify: needs a primitive in the warehouse (primitives/<kind>/<name>.yaml) before kitctl validate passes.
- plugin:gestalt: needs a primitive in the warehouse (primitives/<kind>/<name>.yaml) before kitctl validate passes.
- plugin:prose-author: needs a primitive in the warehouse (primitives/<kind>/<name>.yaml) before kitctl validate passes.
- plugin:prose-review: needs a primitive in the warehouse (primitives/<kind>/<name>.yaml) before kitctl validate passes.
- plugin:prose-tell-scan: needs a primitive in the warehouse (primitives/<kind>/<name>.yaml) before kitctl validate passes.
- plugin:roadmap: needs a primitive in the warehouse (primitives/<kind>/<name>.yaml) before kitctl validate passes.
- plugin:ui-magic: needs a primitive in the warehouse (primitives/<kind>/<name>.yaml) before kitctl validate passes.
- plugin:verification-gate: needs a primitive in the warehouse (primitives/<kind>/<name>.yaml) before kitctl validate passes.
- skill:blader/humanizer: needs a primitive in the warehouse (primitives/<kind>/<name>.yaml) before kitctl validate passes.
- cursor: kitctl does not target Cursor; SETUP.md lists the manual steps.
