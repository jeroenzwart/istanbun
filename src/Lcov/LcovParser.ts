import type { Lcov } from '@@types/Istanbun'
import IstanbunError from '@/Errors/IstanbunError'

export default class LcovParser {
  /**
   * Parse lcov text into one record per source file.
   *
   * @param {string} content The lcov file content.
   *
   * @throws {IstanbunError} INVALID_LCOV when a DA, FN, FNDA or BRDA line is malformed.
   *
   * @public
   */
  public parse(content: string): Lcov.FileRecord[] {
    const records: Lcov.FileRecord[] = []
    let current: Lcov.FileRecord | undefined = undefined

    for (const rawLine of content.split('\n')) {
      const line: string = rawLine.trim()

      if (line.startsWith('SF:')) {
        current = this.createRecord(line.slice(3))
        continue
      }

      if (line === 'end_of_record') {
        if (current !== undefined) {
          records.push(current)
        }
        current = undefined
        continue
      }

      if (current !== undefined) {
        this.applyLine(current, line)
      }
    }

    return records
  }

  /**
   * Create an empty record for a source file.
   *
   * @param {string} path The path as written in the SF line.
   *
   * @private
   */
  private createRecord(path: string): Lcov.FileRecord {
    return { path, lines: new Map<number, number>(), functions: [], branches: [] }
  }

  /**
   * Apply one key:value line to the current record. Unknown keys are ignored.
   *
   * @param {Lcov.FileRecord} record The record being built.
   * @param {string} line The trimmed lcov line.
   *
   * @private
   */
  private applyLine(record: Lcov.FileRecord, line: string): void {
    const separator: number = line.indexOf(':')
    if (separator === -1) {
      return
    }

    const key: string = line.slice(0, separator)
    const value: string = line.slice(separator + 1)

    if (key === 'DA') {
      this.applyLineHits(record, value)

      return
    }

    if (key === 'FN') {
      this.applyFunction(record, value)

      return
    }

    if (key === 'FNDA') {
      this.applyFunctionHits(record, value)

      return
    }

    if (key === 'BRDA') {
      this.applyBranch(record, value)
    }
  }

  /**
   * DA:<line>,<hits>[,<checksum>]
   *
   * @param {Lcov.FileRecord} record The record being built.
   * @param {string} value The part after "DA:".
   *
   * @private
   */
  private applyLineHits(record: Lcov.FileRecord, value: string): void {
    const parts: string[] = value.split(',')
    const line: number = this.parseInteger(parts[0], `DA:${value}`)
    const hits: number = this.parseInteger(parts[1], `DA:${value}`)

    record.lines.set(line, hits)
  }

  /**
   * FN:<line>,<name> (lcov 1.x) or FN:<start>,<end>,<name> (lcov 2.x).
   *
   * @param {Lcov.FileRecord} record The record being built.
   * @param {string} value The part after "FN:".
   *
   * @throws {IstanbunError} INVALID_LCOV when the name is missing.
   *
   * @private
   */
  private applyFunction(record: Lcov.FileRecord, value: string): void {
    const parts: string[] = value.split(',')
    const line: number = this.parseInteger(parts[0], `FN:${value}`)
    const name: string | undefined = parts[parts.length - 1]
    if (name === undefined || parts.length < 2) {
      throw new IstanbunError('INVALID_LCOV', `Malformed lcov line "FN:${value}"`)
    }

    record.functions.push({ name, line, hits: 0 })
  }

  /**
   * FNDA:<hits>,<name>. Creates the function when FN was not seen first.
   *
   * @param {Lcov.FileRecord} record The record being built.
   * @param {string} value The part after "FNDA:".
   *
   * @throws {IstanbunError} INVALID_LCOV when the name is missing.
   *
   * @private
   */
  private applyFunctionHits(record: Lcov.FileRecord, value: string): void {
    const parts: string[] = value.split(',')
    const hits: number = this.parseInteger(parts[0], `FNDA:${value}`)
    const name: string | undefined = parts[1]
    if (name === undefined) {
      throw new IstanbunError('INVALID_LCOV', `Malformed lcov line "FNDA:${value}"`)
    }

    const existing: Lcov.FunctionRecord | undefined = record.functions.find(
      candidate => candidate.name === name,
    )
    if (existing === undefined) {
      record.functions.push({ name, line: 0, hits })

      return
    }

    existing.hits = hits
  }

  /**
   * BRDA:<line>,<block>,<branch>,<taken>, where taken is "-" when the block never ran.
   *
   * @param {Lcov.FileRecord} record The record being built.
   * @param {string} value The part after "BRDA:".
   *
   * @private
   */
  private applyBranch(record: Lcov.FileRecord, value: string): void {
    const parts: string[] = value.split(',')
    const line: number = this.parseInteger(parts[0], `BRDA:${value}`)
    const block: number = this.parseInteger(parts[1], `BRDA:${value}`)
    const branch: number = this.parseInteger(parts[2], `BRDA:${value}`)
    const hits: number = parts[3] === '-' ? 0 : this.parseInteger(parts[3], `BRDA:${value}`)

    record.branches.push({ line, block, branch, hits })
  }

  /**
   * Parse a non-negative integer field.
   *
   * @param {string | undefined} field The raw field.
   * @param {string} context The full line, for the error message.
   *
   * @throws {IstanbunError} INVALID_LCOV when the field is missing or not a number.
   *
   * @private
   */
  private parseInteger(field: string | undefined, context: string): number {
    const parsed: number = Number.parseInt(field ?? '', 10)
    if (Number.isNaN(parsed)) {
      throw new IstanbunError('INVALID_LCOV', `Malformed lcov line "${context}"`)
    }

    return parsed
  }
}

export const lcovParser: LcovParser = new LcovParser()
