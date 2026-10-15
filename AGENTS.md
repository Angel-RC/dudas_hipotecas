# Repository notes

- This is a single-package Vite/TypeScript browser app. `index.html` loads `src/main.ts`; there is no backend or workspace setup.
- `src/main.ts` wires shared state, layout, inputs, routing, and the question list in `src/questions/index.ts`. New questions implement `Question` from `src/questions/types.ts` and must be registered in that list.
- Keep reusable mortgage calculations in `src/calc/`, shared state and validation in `src/state.ts`, and rendering in `src/questions/` or `src/ui/`.
- Navigation uses hash routes (`#/...`); preserve them for static GitHub Pages hosting, which does not provide SPA history-route fallbacks here.
- Install with `npm ci` (the lockfile is committed). CI uses Node 22.
- `npm run dev` starts Vite. `npm run build` runs strict TypeScript checking (`tsc --noEmit`) before the production Vite build.
- Tests use Vitest with jsdom and include `tests/**/*.test.ts` and `tests/**/*.test.js`. Run all with `npm test`; run one file with `npm test -- tests/mortgage.test.ts`.
- `npm run lint` runs `biome check .`. Biome uses 2-space indentation, single quotes, 100-column lines, and ignores `dist/`, `legacy/`, and `node_modules/`.
- `dist/` is generated output; do not edit it. `legacy/` is excluded from lint and is not the Vite app entrypoint.
- GitHub Pages deployment is defined in `.github/workflows/deploy.yml`; only the repository's default branch is deployed. The workflow passes Vite a repository-specific base path (root for `<owner>.github.io` repositories).
