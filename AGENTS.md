# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts the Vite + React front end; components stay in `app/src/components` and API clients in `app/src/api.ts`.
- `api/` contains the Express service. Route handlers stay in `api/src/routes/`, helpers in `api/src/`, and Prisma schema + migrations in `api/prisma/`.
- Core assets sit at the root: `234.txt` powers the literature import script, and `MVP_PLAN*.md` tracks rollout milestones.

## Build, Test, and Development Commands
- `cd api && npm install` then `npm run dev` starts the API with hot reload; run `npm run prisma:migrate` after schema updates to sync SQLite.
- `cd api && npm run build && npm start` compiles TypeScript to `dist/` and launches the production build.
- `cd app && npm install` then `npm run dev` boots the Vite dev server; `npm run build` emits assets to `app/dist`.
- `cd app && npm run lint` applies the React lint profile; fix warnings before opening a PR.

## Coding Style & Naming Conventions
- TypeScript is required in both `api/` and `app/`; avoid implicit `any` and add return types to exported functions.
- Use 2-space indentation, single quotes in Node files, and ES module imports across the repo.
- React components belong in PascalCase files (`OrderList.tsx`), hooks in camelCase (`useOrders.ts`), and API controller exports can end with `Handler`.
- Run `npm run lint` in `app/` before committing; once eslint config lands for the API, add the same check to your workflow.

## Testing Guidelines
- Automated tests are not yet wired; when adding them, colocate unit tests beside sources (`Component.test.tsx`, `orders.test.ts`) and keep integration suites in `api/tests/`.
- Cover order creation, catalog imports, and error paths; include fixtures referencing `234.txt`.
- Until CI is introduced, list the local test command and sample output in each PR.

## Commit & Pull Request Guidelines
- Prefer Conventional Commit headers (`feat:`, `fix:`, `chore:`) with an imperative summary under 72 characters; tag scope (`app`, `api`, `docs`) when useful.
- PRs must describe the change, list impacted directories, note verification (screenshots, commands), and link the relevant `MVP_PLAN*.md` item.
- Keep diffs focused; separate refactors from feature work so reviewers can trace logic changes.

## Data & Environment Notes
- Store secrets (e.g., external DB URLs) in `.env`; never commit those files. Update `.env.example` when new variables appear.
- Run `cd api && npm run literature:load` to refresh the catalog; warn stakeholders it truncates order items.
