# Repository Guidelines

## Project Structure & Module Organization

Aetheria is a Node.js 20 ESM WhatsApp bot built on Baileys. Runtime code lives in `src/`: `src/main.js` boots the app, `src/core/` handles WhatsApp connection and message routing, `src/lib/` contains shared services, and `src/plugins/` contains command modules grouped by feature (`rpg`, `info`, `owner`, `group`, `tools`, etc.). RPG game rules are centralized in `src/lib/rpg.js`; Supabase integration is under `src/lib/supabase/`. Vercel serverless handlers live in `api/`, database DDL in `supabase/schema.sql`, and tests in `tests/`. Generated runtime state such as `auth_info_baileys/`, `sessions/`, and `node_modules/` should not be treated as source.

## Build, Test, and Development Commands

- `npm install`: install dependencies.
- `npm run dev`: run the bot with `node --watch --env-file=.env src/main.js`.
- `npm start`: run the production entry point with `.env`.
- `npm run lint`: run ESLint over the repository.
- `npm run prettier`: format files with Prettier.
- `node --test tests/*.test.js`: run the current Node test suite. There is no `npm test` script yet.
- `npm run vercel-build`: lightweight Vercel build check for serverless functions.

## Coding Style & Naming Conventions

Use ESM imports and the existing `#lib`, `#config`, `#core`, `#utils`, and `#plugins` import aliases. JavaScript style is enforced by ESLint and Prettier: tabs with width 4, double quotes, semicolons, LF line endings, arrow parens, and sorted imports. Plugin files should export a default object with `name`, `command`, and `execute`; use lower-case command names and keep aliases in the `command` array.

## Testing Guidelines

Tests use the built-in `node:test` module with `node:assert/strict`, as shown in `tests/plugins.enqueueCommand.test.js`. Name new tests with a `.test.js` suffix and place them under `tests/`. Add focused tests for shared logic, command queue behavior, parsers, and RPG helpers when changing behavior.

## RPG Agent Playbook

For RPG-focused development, use the shareable agent workflow in `docs/agents/WORKFLOW.md`. It defines the `rpg-lead` orchestrator and sub-agent roles for RPG architecture, core game rules, WhatsApp command wrappers, Supabase persistence, balance, QA, and update marketing.

## Commit & Pull Request Guidelines

Recent history uses short, imperative summaries such as `small update` and `Improve enqueue duplicate detection with normalized command keys`. Prefer concise, specific messages that describe the behavior changed. Pull requests should include a short description, testing performed, linked issue if relevant, and screenshots only for dashboard or web UI changes. Call out `.env`, Supabase schema, or deployment changes explicitly.

## Security & Configuration Tips

Do not commit secrets, WhatsApp auth state, session JSON, or Supabase service role keys. Keep public client keys separate from server-only keys. When changing account linking, restore, premium, guild, or squad logic, verify the corresponding RLS/schema assumptions in `supabase/schema.sql`.
