# Development

How to work on istanbun itself. For using it, see the [README](README.md).

## Requirements

- [Bun](https://bun.sh) 1.4.0 or newer

## Setup

```bash
bun install
```

`bunfig.toml` enables Bun's [security scanner](https://bun.com/docs/pm/security-scanner-api)
with [Socket](https://socket.dev): every `bun install` and `bun add`, also in CI, checks
packages for malware and supply-chain attacks before installing them, and stops on a fatal
finding. Without a token it runs in Socket's free mode; set `SOCKET_API_TOKEN` to use your
Socket organisation's policy instead.

## Scripts

| Command                | What it does                                                |
| ---------------------- | ----------------------------------------------------------- |
| `bun run build`        | Build `src/` and `bin/` into `dist/` (ESM, CJS and `.d.ts`) |
| `bun run typecheck`    | Type-check with `tsc --noEmit`                              |
| `bun run test`         | Run the unit tests in `test/unit`                           |
| `bun run lint`         | Run ESLint                                                  |
| `bun run format`       | Format everything with Prettier                             |
| `bun run format:check` | Check formatting without writing                            |
| `bun run release`      | Release a new version with Shipmark (see Releasing)         |

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
.github/
  workflows/             CI (ci.yml) and npm publishing (publish.yml)
  actions/setup/         Shared job setup: Bun, cached dependencies
.shipmarkrc.yml          Shipmark release configuration
bunfig.toml              Bun install settings (security scanner)
```

Imports use the path aliases `@/*` (for `src/*`), `@@types/*` (for `src/@types/*`) and, in
tests, `#test/*` (for `test/*`), never relative `../` paths.

## Code style

- **Prettier** owns formatting (`.prettierrc`), including import order.
- **ESLint** only checks semantic rules, plus a blank line before every `return`. It also
  enforces explicit types, braces on every `if` and no `!` negation; the last one is a custom
  rule in `eslint/rules/no-negation-operator.js`. Compare explicitly instead:
  `value === false`.

TypeScript is installed twice. `@typescript/native` is TypeScript 7 and provides the `tsc`
that `bun run typecheck` uses. `typescript` is an alias for `@typescript/typescript6`, because
TypeScript 7 ships without a JavaScript API and typescript-eslint needs one. Once
typescript-eslint supports TypeScript 7.1, `typescript` can point at TypeScript 7 again and
`@typescript/native` can go.

## Things to know about Bun

These were measured on Bun 1.4.2 and shape the runner and config code:

- `[test].coverageReporter` and `[test].coverageDir` in `bunfig.toml` override the
  `--coverage-reporter` and `--coverage-dir` CLI flags, contrary to Bun's documentation.
  `src/Config/CoveragePlan.ts` handles this.
- Bun's lcov has no `FN`, `FNDA` or `BRDA` records, so function names and branches are
  missing from the reports.
- `bun test --watch` rewrites `lcov.info` on every rerun. Touching a source file does not
  trigger a rerun; only changing its content does.
- Bun writes no `lcov.info` when a run loads no source file (only test files, a filter without
  matches, a syntax error), even when every test passes. The runner then prints a notice and
  returns bun test's exit code.
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

CI (`.github/workflows/ci.yml`) runs `format`, `lint`, `typecheck` and `test` as parallel
jobs; `build` waits for all four, then builds and smoke-tests the CLI against the fixture
project. Run the same checks before you push:

```bash
bun run format:check && bun run lint && bun run typecheck && bun run test && bun run build
```

## Releasing

Releases use [Shipmark](https://github.com/Grazulex/shipmark) locally and GitHub Actions for
publishing.

```bash
bun run release -- --dry-run   # preview the next version and changelog
bun run release                # bump, write CHANGELOG.md, commit, tag v<version> and push
```

Shipmark derives the version bump from the Conventional Commits since the last tag, updates
`package.json` and `CHANGELOG.md`, commits them as `chore(release): <version>` and pushes the
`v<version>` tag. Use `--ci patch|minor|major` to skip the prompts and `-p beta|alpha|rc` for a
prerelease. The configuration lives in `.shipmarkrc.yml`. Do not pass `--create-release`: the workflow creates the GitHub release.

Pushing the tag starts `.github/workflows/publish.yml`. It runs the CI workflow first, then
checks that the tag matches `package.json`, publishes to npm and creates a GitHub release
from that version's section in `CHANGELOG.md`. Prereleases (`v1.2.0-beta.1`) are published under
the npm dist-tag `next` and marked as prerelease on GitHub.

npm publishing uses [trusted publishing](https://docs.npmjs.com/trusted-publishers), so the
repository needs no npm token. One-time setup:

1. Add a `repository` field to `package.json` that points at the GitHub repository; npm checks
   it against the workflow that publishes.
2. Publish the very first version by hand (`npm publish`; `publishConfig.access` makes the
   scoped package public), because a trusted publisher can only
   be configured for a package that exists.
3. On npmjs.com, open the package settings and add a trusted publisher: GitHub Actions, this
   repository, workflow `publish.yml`.
