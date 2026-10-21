# Status

Last version: 0.1.0

Take the first unchecked item, in order. Tick it in the same commit that lands it.
`tools/check-status.mjs` fails when `package.json` bumps without this file changing,
and when `Last version:` above disagrees with `package.json`.

- [x] 01 scaffold — manifests, marketplaces, package.json, AGENTS/CLAUDE, LICENSE, check gate, test harness
- [x] 02 yaml — `tools/lib/yaml.mjs` (pinned copy), `tools/lib/yaml-emit.mjs`, `tests/yaml.mjs`
- [x] 03 catalog — `catalog/*.yaml`, `tools/lib/catalog.mjs`, `tests/catalog.mjs`
- [x] 04 way — `tools/lib/way.mjs` (incl. topology), `docs/way-schema.md`, `tests/way.mjs`
- [x] 05 lint — `tools/lib/lint.mjs`, `tests/fixtures/lint/`, `tests/lint.mjs`
- [x] 06 survey — `tools/lib/survey.mjs` (with transcript usage), `survey-cli.mjs`, `toml-scan.mjs`, `tokens.mjs`, fixture homes, tests
- [x] 07 compile — WAY.md, block, kit loadouts, worker agents, SETUP.md, TASTE-TEST.md, `--check`
- [x] 08 write — `tools/lib/write.mjs`, `tests/write.mjs`
- [x] 09 skills — `skills/{way,trim,taste}/`
- [x] 10 connor — `examples/connor/` measured from the real plugin checkouts
- [x] 11 personas — `examples/personas/*` (four tabula-rasa people), golden tests
- [x] 12 release — eval stub, DESIGN.md research, upstream.md, README, 0.1.0
