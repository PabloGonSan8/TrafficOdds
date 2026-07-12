# Contributing to TrafficOdds

Thanks for your interest in contributing! This project is a virtual traffic betting simulator — all points are fictional, no real money involved.

## Getting started

1. Fork the repository.
2. Run `npm install`.
3. Start the dev server: `npm run dev`.
4. Open `http://localhost:5173` in your browser.

## Project structure

```
src/
  engine/        Pure logic (no React) — simulation, betting, progression, storage
  context/       React context provider (GameProvider)
  hooks/         Custom hooks (useGame)
  components/    UI components (Tailwind CSS)
  pages/         Route pages
  garito/        Side game (Garito)
```

## Pull request process

1. Create a feature branch from `main`.
2. Keep changes focused — one PR = one concern.
3. Test your changes manually (`npm run dev`).
4. Update the README if your change affects the public API or setup.
5. Open a PR against `main` and request review from a code owner.

## Code style

- ESLint / Prettier are not enforced yet — just follow the existing patterns.
- Use Tailwind utility classes for styling; avoid plain CSS.
- Keep engine functions pure and free of React dependencies.
- Use Spanish or English consistently in the same file (prefer English for code, Spanish is fine for user-facing text).

## Reporting bugs

Open a GitHub issue with:
- A clear title and description.
- Steps to reproduce.
- Expected vs actual behaviour.
- Browser and OS version (if relevant).

## Feature requests

Open a GitHub issue tagged `enhancement`. Describe the problem you want to solve, not just the solution.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
