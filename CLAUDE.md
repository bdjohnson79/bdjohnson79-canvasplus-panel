# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project knowledge

This repository contains a **Grafana panel plugin** (`bdjohnson79-canvasplus-panel`, type: `panel`). You must read @./.config/AGENTS/instructions.md before making changes — it contains critical rules about what you may and may not modify.

The plugin targets Grafana ≥ 12.3.0 and is scaffolded with `@grafana/create-plugin`. The `.config/` directory is managed by Grafana plugin tools — **do not modify it**.

## Commands

```bash
npm run dev          # webpack watch mode (development)
npm run build        # production build
npm run test         # jest --watch (requires git repo)
npm run test:ci      # jest, exits after run (CI)
npm run lint         # eslint
npm run lint:fix     # eslint + prettier auto-fix
npm run typecheck    # tsc --noEmit
npm run server       # docker compose up (Grafana dev instance at localhost:3000)
npm run e2e          # Playwright e2e tests (run `npm run server` first)
npm run sign         # sign plugin for distribution
```

Run a single Jest test file:
```bash
npx jest src/path/to/file.test.tsx
```

Run e2e tests against a specific Grafana version:
```bash
GRAFANA_VERSION=11.3.0 npm run server
```

## Architecture

The plugin is a pure frontend panel plugin (no backend). Entry point is `src/module.ts`, which exports a `PanelPlugin` instance that wires the panel component to its options schema.

**Key files:**
- `src/module.ts` — registers the plugin and declares all panel options via `setPanelOptions`
- `src/types.ts` — `SimpleOptions` interface (the panel's configuration shape)
- `src/components/SimplePanel.tsx` — the React panel component; receives `PanelProps<SimpleOptions>`
- `src/plugin.json` — plugin metadata and Grafana version dependency (restart Grafana after editing)
- `provisioning/` — dashboards and datasources used by the Docker dev environment and e2e tests

**Styling:** uses `@emotion/css` with Grafana's `useStyles2` / `useTheme2` hooks for theme-aware styles.

**Testing:**
- Unit tests: Jest + `@testing-library/react`, configured via `.config/jest.config` (extended in `jest.config.js`)
- E2E tests: Playwright + `@grafana/plugin-e2e` in `tests/panel.spec.ts`; provisioned dashboards/datasources live in `provisioning/`

## Behavioral contract — match the stock Canvas panel

**CanvasPlus must look and behave identically to the stock Grafana Canvas panel for all existing canvas features** (element selection, move, resize, connections, anchor dots, tooltips, context menus). New features requested by the user are additions on top of that baseline — they must not change how existing features feel or work.

Before implementing any canvas interaction, read @./.config/AGENTS/stock-canvas-panel.md — it contains a detailed summary of how the stock panel works (DOM architecture, pointer-event model, connection creation flow, z-index hierarchy). Do **not** re-fetch the Grafana source unless researching something not covered in that document.

Do not invent interaction patterns. If something feels unclear, check the stock panel reference first.

## Documentation

- Grafana plugin docs index: https://grafana.com/developers/plugin-tools/llms.txt
- `@grafana/ui` components: https://developers.grafana.com/ui/latest/index.html
- Add `.md` to any grafana.com docs URL to get plain-text markdown (e.g. `https://grafana.com/developers/plugin-tools/index.md`)
