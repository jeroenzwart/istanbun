import type { Bunfig } from '@@types/Istanbun'
import IstanbunError from '@/Errors/IstanbunError'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

type Table = Record<string, unknown>

export default class BunfigReader {
  /**
   * Read the coverage-related parts of bunfig.toml. A missing file yields empty sections.
   *
   * @param {string} workingDirectory Directory that contains bunfig.toml.
   *
   * @throws {IstanbunError} INVALID_BUNFIG when the file exists but cannot be parsed.
   *
   * @public
   */
  public read(workingDirectory: string): Bunfig.Config {
    const path: string = join(workingDirectory, 'bunfig.toml')
    if (existsSync(path) === false) {
      return { test: {}, istanbun: {} }
    }

    const parsed: Table = this.parse(readFileSync(path, 'utf8'), path)
    const test: Table = this.readTable(parsed, 'test')
    const istanbun: Table = this.readTable(parsed, 'istanbun')

    return {
      test: {
        coverageReporter: this.readStringList(test, 'coverageReporter'),
        coverageDir: this.readString(test, 'coverageDir'),
      },
      istanbun: {
        reporters: this.readStringList(istanbun, 'reporters'),
        outputDir: this.readString(istanbun, 'outputDir'),
      },
    }
  }

  /**
   * Parse TOML with Bun's built-in parser.
   *
   * @param {string} content The file content.
   * @param {string} path The file path, for the error message.
   *
   * @throws {IstanbunError} INVALID_BUNFIG
   *
   * @private
   */
  private parse(content: string, path: string): Table {
    try {
      return Bun.TOML.parse(content) as Table
    } catch (error) {
      const reason: string = error instanceof Error ? error.message : String(error)

      throw new IstanbunError('INVALID_BUNFIG', `Could not parse ${path}: ${reason}`)
    }
  }

  /**
   * Read a table; anything that is not an object yields an empty table.
   *
   * @param {Table} parsed The parsed document.
   * @param {string} key The table name.
   *
   * @private
   */
  private readTable(parsed: Table, key: string): Table {
    const value: unknown = parsed[key]
    if (typeof value !== 'object' || value === null) {
      return {}
    }

    return value as Table
  }

  /**
   * Read a string value; other types yield undefined.
   *
   * @param {Table} table The table to read from.
   * @param {string} key The key.
   *
   * @private
   */
  private readString(table: Table, key: string): string | undefined {
    const value: unknown = table[key]

    return typeof value === 'string' ? value : undefined
  }

  /**
   * Bun accepts both `"lcov"` and `["lcov"]`, so a bare string becomes a one-element list.
   *
   * @param {Table} table The table to read from.
   * @param {string} key The key.
   *
   * @private
   */
  private readStringList(table: Table, key: string): string[] | undefined {
    const value: unknown = table[key]
    if (typeof value === 'string') {
      return [value]
    }
    if (Array.isArray(value) === false) {
      return undefined
    }

    return (value as unknown[]).filter((item: unknown): item is string => typeof item === 'string')
  }
}

export const bunfigReader: BunfigReader = new BunfigReader()
