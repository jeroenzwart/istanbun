# istanbun — design

**Date:** 2026-10-06
**Status:** draft, awaiting review

## Purpose

`bun test --coverage` can only emit `text` and `lcov`. Bun has no reporter plugin API.
istanbun fills that gap: it runs `bun test` with lcov output, converts the lcov data into
an Istanbul `CoverageMap`, and runs any reporter from `istanbul-reports` on it (html,
text-summary, cobertura, clover, json, teamcity, ...).

Conceptually istanbun is to Bun what `c8` is to Node: a native coverage source feeding the
Istanbul reporting stack. It does not instrument code and does not use `nyc`.

## Known limitation (by design)

Bun's lcov contains per-line hit counts (`DA`) and function totals (`FNF`/`FNH`) only. It
has no function names (`FN`/`FNDA`) and no branch data (`BRDA`). This is a JavaScriptCore
limitation, confirmed in Bun PR #40218 ("JSC reports neither branches nor function names").

Consequences, documented in the README:

- Statements and lines are reported; every covered line is one statement.
- Functions and branches are empty in every report. Reporters show them as `100% (0/0)`.
- The lcov parser already reads `FN`, `FNDA` and `BRDA` records so richer data is picked up
  automatically if Bun ever emits it. No other code changes are needed for that.

## Usage

### CLI

```bash
bunx istanbun                                   # bun test --coverage, text report
bunx istanbun --reporter html --reporter text-summary
bunx istanbun --reporter cobertura --output-dir reports/coverage
bunx istanbun -- test/unit --bail               # everything after -- goes to bun test
bunx istanbun --lcov coverage/lcov.info --reporter json   # convert an existing file
bunx istanbun --watch --reporter html             # re-render reports after every rerun
```

Options:

| Flag                             | Default    | Meaning                                                         |
| -------------------------------- | ---------- | --------------------------------------------------------------- |
| `--reporter <name>` (repeatable) | `text`     | Any `istanbul-reports` reporter name                            |
| `--output-dir <path>`            | `coverage` | Directory for file-based reporters                              |
| `--lcov <path>`                  | –          | Use this lcov file instead of running `bun test`                |
| `--watch`                        | off        | Run `bun test --watch` and regenerate reports after every rerun |
| `--help`                         |            | Print usage                                                     |
| `--`                             |            | Pass the remaining arguments to `bun test`                      |

Exit code: the exit code of `bun test`. With `--lcov` it is `0` on success. Invalid
options, an unknown reporter or a bunfig that cannot produce lcov print an error and exit
with `2`. `--watch` and `--lcov` together is an invalid option combination.

### Configuration (`bunfig.toml`)

istanbun reads `bunfig.toml` from the working directory with the built-in `Bun.TOML.parse`.
Two tables matter:

```toml
[test]
coverageReporter = ["text", "lcov"]   # Bun's own setting, see below
coverageDir = "coverage"              # Bun's own setting

[istanbun]                            # istanbun defaults; CLI flags win
reporters = ["html", "text-summary"]
outputDir = "coverage"
```

Precedence for `reporters` and `outputDir`: CLI flag → `[istanbun]` → `[test].coverageDir`
(for `outputDir` only) → built-in default (`["text"]`, `coverage`). Bun ignores unknown
tables in `bunfig.toml`, so the `[istanbun]` table is safe (verified with Bun 1.4.2).

**Why `[test]` must be read.** Bun's docs say CLI flags override `bunfig.toml`, but for
coverage the opposite is true (measured with Bun 1.4.2):

| bunfig `[test]`                                    | CLI                                         | Result                       |
| -------------------------------------------------- | ------------------------------------------- | ---------------------------- |
| `coverageReporter = ["text"]`                      | `--coverage-reporter=lcov --coverage-dir=X` | text only, no lcov written   |
| `coverageReporter = ["lcov"]`, `coverageDir = "Y"` | same                                        | lcov written to `Y`, not `X` |
| `coverageReporter = ["text", "lcov"]`              | same                                        | lcov written to `X`          |
| `coverageDir = "Y"` only                           | same                                        | lcov written to `Y`, not `X` |
| unset                                              | same                                        | lcov written to `X`          |

istanbun therefore decides per run:

- `coverageReporter` unset → add `--coverage-reporter=lcov`.
- `coverageReporter` contains `lcov` → add nothing for the reporter.
- `coverageReporter` set without `lcov` → throw `LCOV_REPORTER_NOT_CONFIGURED` before
  running anything, with the hint to add `"lcov"` to `coverageReporter`. Skipped when
  `--lcov <file>` is used, because no `bun test` run happens then.
- `coverageDir` set → read `lcov.info` from there; Bun ignores `--coverage-dir`.
- `coverageDir` unset → create a temporary directory, pass it as `--coverage-dir`, read
  from there and remove it afterwards.

Everything else in `[test]` (`coverageThreshold`, `coveragePathIgnorePatterns`,
`coverageSkipTestFiles`, `coverageIgnoreSourcemaps`, `root`, `preload`) is applied by Bun
itself to the lcov it writes, so istanbun inherits it without reading it.

This precedence quirk should be reported upstream to Bun; the detection stays even if it
is fixed, because it is also what makes the `coverageDir` fallback correct.

### Watch mode

`bun test --watch --coverage --coverage-reporter=lcov` rewrites `lcov.info` after every
rerun (verified: adding a function raised the `DA` count from 9 to 11 while watching).
istanbun uses that: with `--watch` the runner passes `--watch` through, does not wait for
exit, and watches the lcov directory with `node:fs` `watch`. Each change of `lcov.info`
(debounced 100 ms, ignoring Bun's leftover `.lcov.info.<hash>.tmp` files) re-runs
parse → map → report. Ctrl-C ends `bun test`; istanbun then removes the temporary
directory and exits with its exit code.

### Programmatic API

```typescript
import { Istanbun } from 'istanbun'

const result = await Istanbun.create({
  reporters: ['html', 'text'],
  outputDirectory: 'coverage',
  bunTestArguments: ['test/unit'],
}).run()

result.exitCode // number, exit code of bun test
result.coverageMap // istanbul-lib-coverage CoverageMap
```

Options type (`Istanbun.Options`): `reporters?: string[]`, `outputDirectory?: string`,
`bunTestArguments?: string[]`, `lcovPath?: string`, `watch?: boolean`,
`workingDirectory?: string`. Unset options fall back to `bunfig.toml` as described above.
In watch mode `run()` resolves when `bun test` exits; `onReport?: (coverageMap) => void`
is called after every report cycle for programmatic use.

## Architecture

Pipeline: **configure → run → parse → map → report**. Each step is one class with one
responsibility.

```
src/
  Istanbun.ts                     facade, public entry point
  Cli/IstanbunCommand.ts          argument parsing (node:util parseArgs) → Istanbun
  Config/BunfigReader.ts          bunfig.toml → [test] coverage settings + [istanbun] defaults
  Config/CoveragePlan.ts          decides bun test flags + lcov location from bunfig + options
  Runner/BunTestRunner.ts         spawns bun test (optionally --watch), reports lcov changes
  Lcov/LcovParser.ts              lcov text → LcovRecord[]
  Coverage/CoverageMapFactory.ts  LcovRecord[] → CoverageMap
  Report/IstanbulReportWriter.ts  CoverageMap + reporter names → reports on disk/stdout
  @types/Istanbun.ts              shared types (Options, Result, LcovRecord)
  index.ts                        barrel: export { default as Istanbun } ...
bin/
  istanbun.ts                     #!/usr/bin/env bun → IstanbunCommand
```

### `Config/BunfigReader`

- Stateless singleton. `read(workingDirectory): Bunfig`.
- Reads `bunfig.toml` if present, parses with `Bun.TOML.parse`, returns
  `{ test: { coverageReporter?: string[], coverageDir?: string }, istanbun: { reporters?:
string[], outputDir?: string } }`. Missing file → all undefined. Unparsable file →
  `INVALID_BUNFIG`.

### `Config/CoveragePlan`

- `CoveragePlan.create(bunfig, options): CoveragePlan` — pure decision object, no I/O.
- Exposes `bunTestFlags: string[]` (the `--coverage*` flags to add), `lcovDirectory`
  (`[test].coverageDir` when Bun will write there, otherwise `undefined` meaning "the
  runner creates a temporary directory and passes it as `--coverage-dir`"), `reporters`,
  `outputDirectory` (after applying the precedence rules).
- Throws `LCOV_REPORTER_NOT_CONFIGURED` and `INVALID_REPORTER_LIST`.

### `Runner/BunTestRunner`

- `BunTestRunner.create(workingDirectory, plan, watch)`;
  `run(bunTestArguments, onLcovWritten): Promise<number>` resolves with the exit code.
- Spawns `bun test --coverage <plan.bunTestFlags> ...args` with `Bun.spawn`, stdio
  inherited so the normal test output stays visible. Adds `--watch` when the plan says so.
- Calls `onLcovWritten(lcovPath)` once after exit in normal mode. In watch mode it watches
  `plan.lcovDirectory` with `node:fs` `watch`, filters on the filename `lcov.info`,
  debounces 100 ms and calls `onLcovWritten` after every write; it still calls it once more
  on exit if a write was pending.
- Creates the temporary directory with `fs.mkdtemp` when `plan.lcovDirectory` is
  undefined and removes it afterwards.
- A missing lcov file after a normal run is not an error: Bun writes none when the run loaded
  no source file (only test files, a filter without matches, a syntax error). istanbun prints a
  notice, writes no reports and returns bun test's exit code.

### `Lcov/LcovParser`

- Stateless; the class is the default export and a typed singleton is a named export (`export const lcovParser: LcovParser = new LcovParser()`), as required by `isolatedDeclarations`. Same pattern for `CoverageMapFactory` and `BunfigReader`.
- `parse(content: string): LcovRecord[]`.
- Handles `SF`, `DA`, `FN`, `FNDA`, `FNF`, `FNH`, `BRDA`, `LF`, `LH`, `end_of_record`.
  Unknown keys are ignored. `TN:` lines are ignored.
- `LcovRecord`: `{ path, lines: Map<number, number>, functions: LcovFunction[],
branches: LcovBranch[] }`. With Bun's current output `functions` and `branches` are
  empty arrays.
- Throws `INVALID_LCOV` when a `DA`/`FN`/`BRDA` line cannot be parsed.

### `Coverage/CoverageMapFactory`

- Stateless singleton. `create(records, workingDirectory): CoverageMap`.
- Paths in Bun's lcov are relative to the working directory; they are resolved to absolute
  paths because `istanbul-reports` html reads source files from the `path` property.
- Each `DA` line becomes one statement: `statementMap[i] = { start: { line, column: 0 },
end: { line, column: Number.MAX_SAFE_INTEGER } }`, `s[i] = hits`. The html annotator
  clamps the end column to the line length, so the whole line is highlighted (verified).
- `FN`/`FNDA` → `fnMap`/`f`; `BRDA` → `branchMap`/`b`. Empty with Bun today.

### `Report/IstanbulReportWriter`

- `IstanbulReportWriter.create(outputDirectory)`; `write(coverageMap, reporters): void`.
- Builds a `istanbul-lib-report` context (`dir`, `coverageMap`, default watermarks) and
  calls `istanbul-reports.create(name).execute(context)` per reporter.
- Validates reporter names up front: `istanbul-reports.create` throws on unknown names;
  that error is wrapped as `UNKNOWN_REPORTER` with the offending name so the CLI can show
  it before `bun test` runs.

### `Istanbun` (facade)

`create()` reads the bunfig, builds the `CoveragePlan` and validates the reporters, so
every configuration error surfaces before `bun test` starts.

`run()`:

1. `lcovPath` given → skip runner, report once, `exitCode = 0`.
2. Otherwise `BunTestRunner.run(bunTestArguments, report)`.
3. `report(lcovPath)`: read lcov, `LcovParser.parse`, `CoverageMapFactory.create`,
   `IstanbulReportWriter.write`, call `onReport`. In watch mode this runs per rerun.
4. Return `{ exitCode, coverageMap }` with the last coverage map.

### `Cli/IstanbunCommand`

- `node:util` `parseArgs` with `allowPositionals: true`; positionals (after `--`) become
  `bunTestArguments`.
- `--help` prints usage to stdout and exits `0`.
- Parse errors and configuration errors (`UNKNOWN_REPORTER`, `LCOV_REPORTER_NOT_CONFIGURED`,
  `INVALID_BUNFIG`, `--watch` with `--lcov`) print to stderr and exit `2`.
- Otherwise `process.exit(result.exitCode)`.

## Error handling

- Error codes are SCREAMING_SNAKE_CASE strings: `LCOV_FILE_NOT_FOUND`, `INVALID_LCOV`,
  `UNKNOWN_REPORTER`, `INVALID_REPORTER_LIST` (empty array), `LCOV_REPORTER_NOT_CONFIGURED`,
  `INVALID_BUNFIG`, `WATCH_WITH_LCOV_FILE`.
- The CLI maps codes to one-line messages; the library throws plain `Error` with the code.
- `bun test` failures are not errors for istanbun: reports are still generated and the exit
  code is propagated.

## Dependencies

Runtime: `istanbul-lib-coverage`, `istanbul-lib-report`, `istanbul-reports`.
Dev: their `@types/*`, `typescript`, `bunup`, `prettier`,
`@ianvs/prettier-plugin-sort-imports`, `eslint`, `typescript-eslint`,
`eslint-config-prettier`, `@types/bun`.

Nothing for argument parsing, process spawning, file watching or TOML: `node:util`,
`Bun.spawn`, `node:fs` `watch` and `Bun.TOML.parse`.

## Formatting and linting

Prettier owns formatting; ESLint only runs semantic rules (`typescript-eslint` recommended,
`eslint-config-prettier` disables everything stylistic). The Prettier settings are the
translation of the ESLint Stylistic rules used in the Management-app project:

| Stylistic rule                                                             | Prettier setting                                                |
| -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| no semicolons, single quotes, 2-space indent                               | `semi: false`, `singleQuote: true`, `tabWidth: 2`               |
| `comma-dangle: always-multiline`                                           | `trailingComma: "all"`                                          |
| `arrow-parens: as-needed`                                                  | `arrowParens: "avoid"`                                          |
| `quote-props: consistent-as-needed`                                        | `quoteProps: "consistent"`                                      |
| `object-curly-spacing: always`                                             | `bracketSpacing: true`                                          |
| `object-curly-newline` / `object-property-newline` (multiline, consistent) | `objectWrap: "preserve"`                                        |
| `brace-style` (1tbs)                                                       | Prettier default                                                |
| `import/order` alphabetical, internal before external before builtin       | `@ianvs/prettier-plugin-sort-imports` with `importOrder: ["^(@/ | @@types/ | #test/)", "<THIRD_PARTY_MODULES>", "<BUILTIN_MODULES>"]` |

`printWidth` is `100`; the Stylistic config has no line-length rule, so this is a plain
choice. Not expressible in Prettier and therefore dropped: `space-before-function-paren`
(Prettier never puts a space there), `curly-newline`, `function-paren-newline`.

Semantic ESLint rules kept from that config: `@typescript-eslint/no-explicit-any`,
`no-unused-vars`, `no-unsafe-function-type`, `no-empty-object-type`, `no-namespace: off`,
`no-useless-assignment`, plus `@typescript-eslint/typedef` for explicit types.
Explicit comparisons (`=== false`) instead of `!` are a convention, not a lint rule here.

## Testing

Deferred. No tests are part of this spec; a follow-up adds `bun:test` specs under
`test/unit/specs/` mirroring `src/` and an integration test with a fixture project.
Until then the manual check is the fixture project from the spike: `bunx istanbun
--reporter html` must produce an `index.html` whose line percentage matches Bun's own
text summary.

## Repository

- `package.json`: `"type": "module"`, `bin: { istanbun: "dist/bin/istanbun.js" }`, dual
  ESM/CJS `exports` built by bunup, `engines.bun >= 1.1`.
- `tsconfig.json`: strict, `noUnusedLocals`, `noUnusedParameters`,
  `noUncheckedIndexedAccess`, `noImplicitOverride`, `isolatedDeclarations`; aliases `@/*`,
  `@@types/*`, `#test/*`.
- `README.md`: install, usage, reporter list link, the JSC limitation, the bunfig
  precedence quirk, the `[istanbun]` table, watch mode, programmatic API.
- `LICENSE`: MIT.
- `.prettierrc` and `eslint.config.mjs` as described above; scripts `format`, `lint`,
  `build`.
- `.github/workflows/ci.yml`: `oven-sh/setup-bun`, `bun install --frozen-lockfile`,
  `bun run format:check`, `bun run lint`, `bun run build`. A `bun test` step is added
  together with the tests.
- `.gitignore`: `node_modules`, `dist`, `coverage`.

## Out of scope

- Coverage thresholds (Bun's `coverageThreshold` already fails the run).
- Reading anything from `bunfig.toml` beyond `[test].coverageReporter`,
  `[test].coverageDir` and the `[istanbun]` table.
- Merging multiple lcov files.
