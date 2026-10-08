import type { Cli, Istanbun as IstanbunTypes } from '@@types/Istanbun'
import ArgumentParser from '@/Cli/ArgumentParser'
import IstanbunError from '@/Errors/IstanbunError'
import Istanbun from '@/Istanbun'

const USAGE: string = `Usage: istanbun [options] [bun test arguments] [-- <bun test arguments>]

Runs "bun test --coverage" and renders the coverage with Istanbul reporters. Arguments that
are not istanbun options are passed to bun test; everything after -- is passed verbatim.

Options:
  --reporter <name>     istanbul-reports reporter, repeatable (default: text, or [istanbun].reporters)
  --output-dir <path>   directory for file-based reporters (default: coverage, or bunfig)
  --lcov <path>         convert an existing lcov file instead of running bun test
  --watch               run "bun test --watch" and re-render after every rerun
  --help                show this help

Reporters: clover, cobertura, html, html-spa, json, json-summary, lcov, lcovonly,
teamcity, text, text-lcov, text-summary.
`

export default class IstanbunCommand {
  private readonly argv: string[]

  /**
   * Create the command for the given arguments (without the executable and script).
   *
   * @param {string[]} argv Command-line arguments.
   *
   * @public
   */
  public static create(argv: string[]): IstanbunCommand {
    return new IstanbunCommand(argv)
  }

  /**
   * Store the command-line arguments.
   *
   * @param {string[]} argv Command-line arguments.
   *
   * @public
   */
  public constructor(argv: string[]) {
    this.argv = argv
  }

  /**
   * Run the command and return the process exit code: bun test's code, 0 for --help/--lcov,
   * 2 for configuration or usage errors.
   *
   * @public
   */
  public async run(): Promise<number> {
    try {
      return await this.execute()
    } catch (error) {
      return this.reportError(error)
    }
  }

  /**
   * Parse, build the facade and run it.
   *
   * @private
   */
  private async execute(): Promise<number> {
    const parsed: Cli.Arguments = ArgumentParser.parse(this.argv)
    if (parsed.values.help === true) {
      process.stdout.write(USAGE)

      return 0
    }

    const istanbun: Istanbun = Istanbun.create({
      reporters: parsed.values.reporter,
      outputDirectory: parsed.values['output-dir'],
      lcovPath: parsed.values.lcov,
      watch: parsed.values.watch,
      bunTestArguments: parsed.bunTestArguments,
    })
    const result: IstanbunTypes.Result = await istanbun.run()

    return result.exitCode
  }

  /**
   * Print the error as one line: exit 2 for usage and configuration errors, 1 for anything else.
   *
   * @param {unknown} error The caught error.
   *
   * @private
   */
  private reportError(error: unknown): number {
    if (error instanceof IstanbunError) {
      process.stderr.write(`istanbun: ${error.message}\n`)
      if (error.hint !== undefined) {
        process.stderr.write(`  hint: ${error.hint}\n`)
      }

      return 2
    }

    if (this.isParseError(error) === true) {
      process.stderr.write(`istanbun: ${error.message}\n\n${USAGE}`)

      return 2
    }

    const message: string = error instanceof Error ? error.message : String(error)
    process.stderr.write(`istanbun: ${message}\n`)

    return 1
  }

  /**
   * node:util parseArgs errors carry codes starting with ERR_PARSE_ARGS.
   *
   * @param {unknown} error The caught error.
   *
   * @private
   */
  private isParseError(error: unknown): error is Error & { code: string } {
    if (error instanceof Error === false) {
      return false
    }
    const code: unknown = (error as Error & { code?: unknown }).code

    return typeof code === 'string' && code.startsWith('ERR_PARSE_ARGS')
  }
}
