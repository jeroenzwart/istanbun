import type { Cli } from '@@types/Istanbun'
import { parseArgs, type ParseArgsOptionsConfig } from 'node:util'

const OPTIONS: ParseArgsOptionsConfig = {
  'reporter': { type: 'string', multiple: true },
  'output-dir': { type: 'string' },
  'lcov': { type: 'string' },
  'watch': { type: 'boolean' },
  'help': { type: 'boolean' },
}

const SEPARATOR: string = '--'

/**
 * Splits the command line into istanbun's own options and the arguments for `bun test`.
 *
 * Bun drops a `--` that is the first script argument, so `istanbun -- --isolate` arrives as
 * `['--isolate']`. Every argument that is not an istanbun option is therefore forwarded, and
 * everything after a `--` that survived is forwarded verbatim.
 */
class ArgumentParser {
  /**
   * Parse the arguments: istanbun's options strictly, everything else for `bun test`.
   *
   * @param {string[]} argv Command-line arguments (without the executable and script).
   *
   * @throws {TypeError} Will throw an ERR_PARSE_ARGS error for an invalid istanbun option.
   *
   * @public
   */
  public parse(argv: string[]): Cli.Arguments {
    const istanbunArguments: string[] = []
    const bunTestArguments: string[] = []
    this.split(argv, istanbunArguments, bunTestArguments)

    const parsed: { values: Cli.Arguments['values'] } = parseArgs({
      args: istanbunArguments,
      options: OPTIONS,
      strict: true,
    }) as { values: Cli.Arguments['values'] }

    return { values: parsed.values, bunTestArguments }
  }

  /**
   * Distribute the arguments over istanbun and bun test, keeping their order.
   *
   * @param {string[]} argv Command-line arguments.
   * @param {string[]} istanbunArguments Receives istanbun's options and their values.
   * @param {string[]} bunTestArguments Receives everything else.
   *
   * @private
   */
  private split(argv: string[], istanbunArguments: string[], bunTestArguments: string[]): void {
    for (let index: number = 0; index < argv.length; index++) {
      const argument: string = argv[index] as string
      if (argument === SEPARATOR) {
        bunTestArguments.push(...argv.slice(index + 1))

        return
      }

      const name: string | undefined = this.optionName(argument)
      if (name === undefined) {
        bunTestArguments.push(argument)
        continue
      }

      istanbunArguments.push(argument)
      if (this.takesSeparateValue(name, argument) === true && index + 1 < argv.length) {
        index++
        istanbunArguments.push(argv[index] as string)
      }
    }
  }

  /**
   * The istanbun option name of `--name` or `--name=value`, or undefined for anything else.
   *
   * @param {string} argument A single command-line argument.
   *
   * @private
   */
  private optionName(argument: string): string | undefined {
    if (argument.startsWith('--') === false) {
      return undefined
    }
    const name: string = argument.slice(2).split('=')[0] as string

    return Object.hasOwn(OPTIONS, name) ? name : undefined
  }

  /**
   * Whether a string option is given without an inline `=value`, so its value is the next argument.
   *
   * @param {string} name The istanbun option name.
   * @param {string} argument The argument as given.
   *
   * @private
   */
  private takesSeparateValue(name: string, argument: string): boolean {
    return OPTIONS[name]?.type === 'string' && argument.includes('=') === false
  }
}

const argumentParser: ArgumentParser = new ArgumentParser()

export default argumentParser
