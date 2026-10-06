import type { Bunfig, Istanbun } from '@@types/Istanbun'
import IstanbunError from '@/Errors/IstanbunError'

export default class CoveragePlan {
  /** Reporter names after applying CLI → [istanbun] → default precedence. */
  public readonly reporters: string[]
  /** Output directory (relative to the working directory) after precedence. */
  public readonly outputDirectory: string
  /** Flags to add to `bun test`, without `--coverage-dir` (the runner adds it when needed). */
  public readonly bunTestFlags: string[]
  /** Where Bun will write lcov.info, or undefined when the runner must create a temporary directory. */
  public readonly lcovDirectory: string | undefined

  /**
   * Decide how `bun test` is invoked and where its lcov output lands.
   *
   * @param {Bunfig.Config} bunfig The parsed bunfig sections.
   * @param {Istanbun.Options} options The caller's options.
   *
   * @public
   */
  public static create(bunfig: Bunfig.Config, options: Istanbun.Options): CoveragePlan {
    return new CoveragePlan(bunfig, options)
  }

  /**
   * Apply the precedence rules and validate the result.
   *
   * @param {Bunfig.Config} bunfig The parsed bunfig sections.
   * @param {Istanbun.Options} options The caller's options.
   *
   * @throws {IstanbunError} INVALID_REPORTER_LIST when the reporter list is empty.
   * @throws {IstanbunError} LCOV_REPORTER_NOT_CONFIGURED when bunfig pins reporters without lcov.
   *
   * @public
   */
  public constructor(bunfig: Bunfig.Config, options: Istanbun.Options) {
    this.reporters = options.reporters ?? bunfig.istanbun.reporters ?? ['text']
    if (this.reporters.length === 0) {
      throw new IstanbunError('INVALID_REPORTER_LIST', 'At least one reporter is required')
    }

    this.outputDirectory =
      options.outputDirectory ?? bunfig.istanbun.outputDir ?? bunfig.test.coverageDir ?? 'coverage'
    this.lcovDirectory = bunfig.test.coverageDir
    this.bunTestFlags = this.resolveBunTestFlags(bunfig.test, options.lcovPath === undefined)
  }

  /**
   * bunfig `coverageReporter` overrides the CLI flag (measured on Bun 1.4.2), so the flag is
   * only useful when bunfig does not set it, and lcov is impossible when bunfig sets it without lcov.
   *
   * @param {Bunfig.TestSection} test The [test] section.
   * @param {boolean} willRunBunTest False when an existing lcov file is converted.
   *
   * @throws {IstanbunError} LCOV_REPORTER_NOT_CONFIGURED
   *
   * @private
   */
  private resolveBunTestFlags(test: Bunfig.TestSection, willRunBunTest: boolean): string[] {
    if (test.coverageReporter === undefined) {
      return ['--coverage', '--coverage-reporter=lcov']
    }

    if (willRunBunTest === true && test.coverageReporter.includes('lcov') === false) {
      throw new IstanbunError(
        'LCOV_REPORTER_NOT_CONFIGURED',
        'bunfig.toml sets [test].coverageReporter without "lcov", so bun test cannot write lcov.info',
        'Add "lcov" to coverageReporter in bunfig.toml, or remove the key.',
      )
    }

    return ['--coverage']
  }
}
