import type { CoverageMap } from 'istanbul-lib-coverage'

export namespace Istanbun {
  export type Options = {
    /** istanbul-reports reporter names; falls back to bunfig `[istanbun].reporters`, then `['text']`. */
    reporters?: string[]
    /** Directory for file-based reporters; falls back to `[istanbun].outputDir`, `[test].coverageDir`, `coverage`. */
    outputDirectory?: string
    /** Arguments passed through to `bun test`. */
    bunTestArguments?: string[]
    /** Convert this lcov file instead of running `bun test`. */
    lcovPath?: string
    /** Run `bun test --watch` and regenerate reports after every rerun. */
    watch?: boolean
    /** Defaults to `process.cwd()`. */
    workingDirectory?: string
    /** Called after every report cycle (once normally, per rerun in watch mode). */
    onReport?: ReportListener
  }

  export type Result = {
    exitCode: number
    coverageMap: CoverageMap
  }

  export type ReportListener = (coverageMap: CoverageMap) => void

  export type LcovListener = (lcovPath: string) => Promise<void>
}

export namespace Lcov {
  export type FileRecord = {
    path: string
    lines: Map<number, number>
    functions: FunctionRecord[]
    branches: BranchRecord[]
  }

  export type FunctionRecord = {
    name: string
    line: number
    hits: number
  }

  export type BranchRecord = {
    line: number
    block: number
    branch: number
    hits: number
  }
}

export namespace Bunfig {
  export type Config = {
    test: TestSection
    istanbun: IstanbunSection
  }

  export type TestSection = {
    coverageReporter?: string[]
    coverageDir?: string
  }

  export type IstanbunSection = {
    reporters?: string[]
    outputDir?: string
  }
}

export type IstanbunErrorCode =
  | 'INVALID_BUNFIG'
  | 'INVALID_LCOV'
  | 'INVALID_REPORTER_LIST'
  | 'LCOV_FILE_NOT_FOUND'
  | 'LCOV_NOT_GENERATED'
  | 'LCOV_REPORTER_NOT_CONFIGURED'
  | 'UNKNOWN_REPORTER'
  | 'WATCH_WITH_LCOV_FILE'
