import type { Lcov } from '@@types/Istanbun'
import {
  createCoverageMap,
  createFileCoverage,
  type CoverageMap,
  type FileCoverage,
  type FileCoverageData,
  type Range,
} from 'istanbul-lib-coverage'
import { resolve } from 'node:path'

export default class CoverageMapFactory {
  /**
   * Build an Istanbul coverage map from parsed lcov records.
   *
   * @param {Lcov.FileRecord[]} records Parsed lcov records.
   * @param {string} workingDirectory Directory the lcov paths are relative to.
   *
   * @public
   */
  public create(records: Lcov.FileRecord[], workingDirectory: string): CoverageMap {
    const coverageMap: CoverageMap = createCoverageMap({})

    for (const record of records) {
      coverageMap.addFileCoverage(this.createFileCoverage(record, workingDirectory))
    }

    return coverageMap
  }

  /**
   * Convert one record. Paths are made absolute because the html reporter reads sources from them.
   *
   * @param {Lcov.FileRecord} record The record to convert.
   * @param {string} workingDirectory Directory the lcov paths are relative to.
   *
   * @private
   */
  private createFileCoverage(record: Lcov.FileRecord, workingDirectory: string): FileCoverage {
    const data: FileCoverageData = {
      path: resolve(workingDirectory, record.path),
      statementMap: {},
      fnMap: {},
      branchMap: {},
      s: {},
      f: {},
      b: {},
    }

    this.addStatements(data, record.lines)
    this.addFunctions(data, record.functions)
    this.addBranches(data, record.branches)

    return createFileCoverage(data)
  }

  /**
   * Every DA line becomes one statement spanning the whole line.
   *
   * @param {FileCoverageData} data The coverage data being built.
   * @param {Map<number, number>} lines Line number to hit count.
   *
   * @private
   */
  private addStatements(data: FileCoverageData, lines: Map<number, number>): void {
    let index: number = 0

    for (const [line, hits] of lines) {
      const id: string = String(index)
      data.statementMap[id] = this.createLineRange(line)
      data.s[id] = hits
      index++
    }
  }

  /**
   * Map FN/FNDA records. Empty with Bun today (ponytail: JSC emits no function names).
   *
   * @param {FileCoverageData} data The coverage data being built.
   * @param {Lcov.FunctionRecord[]} functions Parsed function records.
   *
   * @private
   */
  private addFunctions(data: FileCoverageData, functions: Lcov.FunctionRecord[]): void {
    functions.forEach((functionRecord: Lcov.FunctionRecord, index: number): void => {
      const id: string = String(index)
      const range: Range = this.createLineRange(functionRecord.line)
      data.fnMap[id] = {
        name: functionRecord.name,
        decl: range,
        loc: range,
        line: functionRecord.line,
      }
      data.f[id] = functionRecord.hits
    })
  }

  /**
   * Group BRDA records per line+block into one Istanbul branch each. Empty with Bun today.
   *
   * @param {FileCoverageData} data The coverage data being built.
   * @param {Lcov.BranchRecord[]} branches Parsed branch records.
   *
   * @private
   */
  private addBranches(data: FileCoverageData, branches: Lcov.BranchRecord[]): void {
    const groups: Map<string, Lcov.BranchRecord[]> = new Map<string, Lcov.BranchRecord[]>()

    for (const branch of branches) {
      const key: string = `${branch.line}:${branch.block}`
      const group: Lcov.BranchRecord[] = groups.get(key) ?? []
      group.push(branch)
      groups.set(key, group)
    }

    let index: number = 0
    for (const group of groups.values()) {
      const line: number = group[0]?.line ?? 0
      const id: string = String(index)
      data.branchMap[id] = {
        loc: this.createLineRange(line),
        type: 'branch',
        locations: group.map((): Range => this.createLineRange(line)),
        line,
      }
      data.b[id] = group.map((branch: Lcov.BranchRecord): number => branch.hits)
      index++
    }
  }

  /**
   * A range covering one whole line. The html annotator clamps the end column to the line length.
   *
   * @param {number} line The 1-based line number.
   *
   * @private
   */
  private createLineRange(line: number): Range {
    return {
      start: { line, column: 0 },
      end: { line, column: Number.MAX_SAFE_INTEGER },
    }
  }
}

export const coverageMapFactory: CoverageMapFactory = new CoverageMapFactory()
