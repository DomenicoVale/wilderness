# Tooling

## Formatting
- Biome is the formatter.
- Run `npm run format` to format the repository and apply safe fixes.
- Run `npm run format:fix` to format and apply unsafe auto-fixes (`--unsafe`) when `npm run format` leaves issues behind.
- A `pre-commit` hook runs the formatter automatically via `simple-git-hooks`.
- Run `npm run check` after significant changes to validate TypeScript.

## Styling
- Tailwind is configured in `tailwind.config.js`.
- PostCSS plugins live in `postcss.config.cjs`.

## Dev Server Port
- WXT dev server defaults to port `3000`.
- Override locally with `WXT_DEV_PORT` (example: `WXT_DEV_PORT=3002 npm run dev`).
