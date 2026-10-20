# kitctl gaps

What kitctl needs before these loadouts apply cleanly.

- mcp:github: needs a primitive in the warehouse (primitives/<kind>/<name>.yaml) before kitctl validate passes.
- mcp:linear: needs a primitive in the warehouse (primitives/<kind>/<name>.yaml) before kitctl validate passes.
- plugin:compounder: needs a primitive in the warehouse (primitives/<kind>/<name>.yaml) before kitctl validate passes.
- plugin:verification-gate: needs a primitive in the warehouse (primitives/<kind>/<name>.yaml) before kitctl validate passes.
- cursor: kitctl does not target Cursor; SETUP.md lists the manual steps.
