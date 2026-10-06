import IstanbunError from '@/Errors/IstanbunError'
import type { CoverageMap } from 'istanbul-lib-coverage'
import { createContext, type Context } from 'istanbul-lib-report'
import { create as createReport, type ReportType } from 'istanbul-reports'

type Report = ReturnType<typeof createReport>

const KNOWN_REPORTERS: string =
  'clover, cobertura, html, html-spa, json, json-summary, lcov, lcovonly, teamcity, text, text-lcov, text-summary'

export default class IstanbulReportWriter {
  private readonly outputDirectory: string

  /**
   * Create a writer for the given output directory.
   *
   * @param {string} outputDirectory Absolute directory for file-based reporters.
   *
   * @public
   */
  public static create(outputDirectory: string): IstanbulReportWriter {
    return new IstanbulReportWriter(outputDirectory)
  }

  /**
   * Store the output directory.
   *
   * @param {string} outputDirectory Absolute directory for file-based reporters.
   *
   * @public
   */
  public constructor(outputDirectory: string) {
    this.outputDirectory = outputDirectory
  }

  /**
   * Check that every reporter name can be instantiated, before any tests run.
   *
   * @param {string[]} reporters istanbul-reports reporter names.
   *
   * @throws {IstanbunError} UNKNOWN_REPORTER naming the first unknown reporter.
   *
   * @public
   */
  public validate(reporters: string[]): void {
    for (const reporter of reporters) {
      this.instantiate(reporter)
    }
  }

  /**
   * Run every reporter against the coverage map.
   *
   * @param {CoverageMap} coverageMap The coverage to report.
   * @param {string[]} reporters istanbul-reports reporter names.
   *
   * @public
   */
  public write(coverageMap: CoverageMap, reporters: string[]): void {
    const context: Context = createContext({
      dir: this.outputDirectory,
      coverageMap,
      defaultSummarizer: 'nested',
    })

    for (const reporter of reporters) {
      this.instantiate(reporter).execute(context)
    }
  }

  /**
   * istanbul-reports resolves unknown names as modules, so a failure here means "unknown reporter".
   *
   * @param {string} reporter The reporter name.
   *
   * @throws {IstanbunError} UNKNOWN_REPORTER
   *
   * @private
   */
  private instantiate(reporter: string): Report {
    try {
      return createReport(reporter as ReportType, {})
    } catch {
      throw new IstanbunError(
        'UNKNOWN_REPORTER',
        `Unknown reporter "${reporter}"`,
        `Valid names: ${KNOWN_REPORTERS}.`,
      )
    }
  }
}
