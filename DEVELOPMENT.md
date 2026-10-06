# Development

How to work on istanbun itself. For using it, see the [README](README.md).

## Requirements

- [Bun](https://bun.sh) 1.4.0 or newer

## Setup

```bash
bun install
```

## Scripts

| Command                | What it does                                                |
| ---------------------- | ----------------------------------------------------------- |
| `bun run build`        | Build `src/` and `bin/` into `dist/` (ESM, CJS and `.d.ts`) |
| `bun run typecheck`    | Type-check with `tsc --noEmit`                              |
| `bun run test`         | Run the unit tests in `test/unit`                           |
| `bun run lint`         | Run ESLint                                                  |
| `bun run format`       | Format everything with Prettier                             |
| `bun run format:check` | Check formatting without writing                            |

## Running the CLI locally

Bun runs the TypeScript entry point directly, so no build is needed while developing. The
fixture project in `test/fixtures/project` is a small Bun project with a test suite to run
against:

```bash
cd test/fixtures/project
bun ../../../bin/istanbun.ts --reporter text-summary
```

To convert an lcov file without running tests, use the fixtures in `test/fixtures/lcov`:

```bash
bun bin/istanbun.ts --lcov test/fixtures/lcov/bun.lcov --reporter text
```

To check the built package the way CI does, run `bun run build` and call
`dist/bin/istanbun.js` instead.

## Project structure

```
bin/istanbun.ts          CLI entry point
src/
  index.ts               Public package exports
  Istanbun.ts            Facade behind the programmatic API
  @types/                Shared type definitions
  Cli/                   Argument parsing and the istanbun command
  Config/                bunfig.toml reading and the bun test invocation plan
  Coverage/              lcov records → Istanbul coverage map
  Errors/                IstanbunError
  Lcov/                  lcov parser
  Report/                Writes istanbul-reports output
  Runner/                Runs bun test and watches lcov output in watch mode
eslint/rules/            Project-specific ESLint rules
test/
  unit/specs/            Unit tests, mirroring src/
  helpers/               Shared test helpers, imported as #test/helpers/*
  fixtures/              Fixture project and lcov files
docs/superpowers/        Design spec and implementation plan
```

Imports use the path aliases `@/*` (for `src/*`) and `@@types/*` (for `src/@types/*`), never
relative `../` paths.

## Code style

- **Prettier** owns formatting (`.prettierrc`), including import order.
- **ESLint** only checks semantic rules, plus a blank line before every `return`. It also
  enforces explicit types, braces on every `if` and no `!` negation; the last one is a custom
  rule in `eslint/rules/no-negation-operator.js`. Compare explicitly instead:
  `value === false`.

## Things to know about Bun

These were measured on Bun 1.4.2 and shape the runner and config code:

- `[test].coverageReporter` and `[test].coverageDir` in `bunfig.toml` override the
  `--coverage-reporter` and `--coverage-dir` CLI flags, contrary to Bun's documentation.
  `src/Config/CoveragePlan.ts` handles this.
- Bun's lcov has no `FN`, `FNDA` or `BRDA` records, so function names and branches are
  missing from the reports.
- `bun test --watch` rewrites `lcov.info` on every rerun. Touching a source file does not
  trigger a rerun; only changing its content does.
- Bun ignores unknown tables in `bunfig.toml`, which is why the `[istanbun]` table is safe.

## Tests

Tests use `bun:test` and live in `test/unit/specs/`, one `*.spec.ts` per source module in the
same folder structure as `src/`. Each file has `describe('@/path/Module')` with
`it('should …')` cases.

```bash
bun run test
```

Run tests with `bun run test`, not plain `bun test`: plain `bun test` also picks up the
fixture project's own test file in `test/fixtures/project`.

`test/helpers/TemporaryDirectory.ts` gives each spec its own temporary directory, and
`test/helpers/Fixtures.ts` points at the fixtures. The `BunTestRunner` and `Istanbun` specs
spawn a real `bun test` in a copy of the fixture project, so its output appears among the
test results, including the failures those specs cause on purpose. Watch mode is not
covered: it only ends on Ctrl-C.

CI runs formatting, linting, type-checking, the tests, the build and a smoke test of the
built CLI against the fixture project (`.github/workflows/ci.yml`). Run the same checks
before you push:

```bash
bun run format:check && bun run lint && bun run typecheck && bun run test && bun run build
```
