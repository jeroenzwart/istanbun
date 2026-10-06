# istanbun

Istanbul coverage reporters for `bun test`.

`bun test --coverage` can only print a text table or write an lcov file. istanbun runs
`bun test` for you, converts Bun's lcov output into an Istanbul coverage map and renders it
with any [istanbul-reports](https://github.com/istanbuljs/istanbuljs/tree/main/packages/istanbul-reports/lib)
reporter: `html`, `text-summary`, `cobertura`, `clover`, `json`, `teamcity` and more.

istanbun is to Bun what [c8](https://github.com/bcoe/c8) is to Node: it does not instrument
your code. Bun's native coverage feeds the Istanbul reporting stack.

## Install

```bash
bun add -d istanbun
```

## Usage

```bash
bunx istanbun                                       # bun test --coverage, Istanbul text table
bunx istanbun --reporter html --reporter text-summary
bunx istanbun --reporter cobertura --output-dir reports/coverage
bunx istanbun -- test/unit --bail                   # everything after -- goes to bun test
bunx istanbun --lcov coverage/lcov.info --reporter json   # convert an existing lcov file
bunx istanbun --watch --reporter html               # re-render after every bun test rerun
```

| Flag                             | Default    | Meaning                                                 |
| -------------------------------- | ---------- | ------------------------------------------------------- |
| `--reporter <name>` (repeatable) | `text`     | Any istanbul-reports reporter name                      |
| `--output-dir <path>`            | `coverage` | Directory for file-based reporters                      |
| `--lcov <path>`                  | –          | Use this lcov file instead of running `bun test`        |
| `--watch`                        | off        | Run `bun test --watch` and regenerate after every rerun |
| `--help`                         |            | Print usage                                             |
| `--`                             |            | Pass the remaining arguments to `bun test`              |

The exit code is the exit code of `bun test`, so a failing suite still fails your CI. With
`--lcov` the exit code is `0`. Invalid options, an unknown reporter or a `bunfig.toml` that
cannot produce lcov output exit with `2` before any test runs.

Reporter names: `clover`, `cobertura`, `html`, `html-spa`, `json`, `json-summary`, `lcov`,
`lcovonly`, `teamcity`, `text`, `text-lcov`, `text-summary`.

## Configuration

istanbun reads `bunfig.toml` from the working directory. Defaults for the CLI flags live in
an `[istanbun]` table; Bun ignores tables it does not know.

```toml
[test]
coverageReporter = ["text", "lcov"]   # Bun's own setting, see "Known limitations"
coverageDir = "coverage"              # Bun's own setting

[istanbun]
reporters = ["html", "text-summary"]
outputDir = "coverage"
```

Precedence for reporters and the output directory: CLI flag, then `[istanbun]`, then
`[test].coverageDir` (output directory only), then the built-in defaults.

The `lcov` and `lcovonly` reporters write their own `lcov.info` into the output directory.
When that is Bun's `coverageDir`, Istanbul's file replaces the one Bun wrote; the coverage
data is the same, only the formatting differs.

Everything else in `[test]` (`coverageThreshold`, `coveragePathIgnorePatterns`,
`coverageSkipTestFiles`, `coverageIgnoreSourcemaps`, `root`, `preload`) is applied by Bun
itself before istanbun sees the lcov file, so it works without any istanbun configuration.

## Known limitations

**No function names or branches.** Bun's lcov contains per-line hit counts and function
totals only. JavaScriptCore reports neither branches nor function names, as Bun's own
cobertura reporter PR puts it ([oven-sh/bun#40218](https://github.com/oven-sh/bun/pull/40218);
see also [oven-sh/bun#7100](https://github.com/oven-sh/bun/issues/7100)). Reports therefore
show statements and lines, while functions and branches read `100% (0/0)`. istanbun already
parses `FN`, `FNDA` and `BRDA` records, so richer output from a future Bun is picked up
automatically.

**bunfig overrides the CLI.** Bun's documentation says command-line flags override
`bunfig.toml`, but for coverage the opposite holds (measured on Bun 1.4.2):
`[test].coverageReporter` and `[test].coverageDir` win over `--coverage-reporter` and
`--coverage-dir`. istanbun detects this. When your bunfig sets `coverageReporter` without
`"lcov"`, istanbun stops with a clear message instead of running tests that cannot produce
an lcov file. When `coverageDir` is set, istanbun reads the lcov file from there.

## Programmatic API

```typescript
import { Istanbun } from 'istanbun'

const result = await Istanbun.create({
  reporters: ['html', 'text-summary'],
  outputDirectory: 'coverage',
  bunTestArguments: ['test/unit'],
  onReport: coverageMap => console.log(coverageMap.getCoverageSummary().lines.pct),
}).run()

result.exitCode // exit code of bun test
result.coverageMap // istanbul-lib-coverage CoverageMap
```

Options: `reporters`, `outputDirectory`, `bunTestArguments`, `lcovPath`, `watch`,
`workingDirectory` and `onReport`. Unset options fall back to `bunfig.toml` as described
above. In watch mode `run()` resolves when `bun test` exits and `onReport` is called after
every rerun. Configuration errors throw an `IstanbunError` with a `code` such as
`UNKNOWN_REPORTER` or `LCOV_REPORTER_NOT_CONFIGURED` and an optional `hint`.

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for setup, scripts, project structure and tests.

## License

MIT
