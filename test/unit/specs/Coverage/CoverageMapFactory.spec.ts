import type { Lcov } from '@@types/Istanbun'
import CoverageMapFactory from '@/Coverage/CoverageMapFactory'
import { describe, expect, it } from 'bun:test'
import type { CoverageMap, CoverageSummary, FileCoverage } from 'istanbul-lib-coverage'

describe('@/Coverage/CoverageMapFactory', (): void => {
  const factory: CoverageMapFactory = new CoverageMapFactory()
  const record: Lcov.FileRecord = {
    path: 'src/full.ts',
    lines: new Map<number, number>([
      [1, 3],
      [2, 0],
    ]),
    functions: [
      { name: 'sign', line: 1, hits: 3 },
      { name: 'unused', line: 10, hits: 0 },
    ],
    branches: [
      { line: 2, block: 0, branch: 0, hits: 1 },
      { line: 2, block: 0, branch: 1, hits: 0 },
      { line: 5, block: 1, branch: 0, hits: 2 },
    ],
  }

  it('should resolve file paths against the working directory', (): void => {
    // Act
    const coverageMap: CoverageMap = factory.create([record], '/project')

    // Assert
    expect(coverageMap.files()).toEqual(['/project/src/full.ts'])
  })

  it('should turn every line into a statement spanning that line', (): void => {
    // Act
    const fileCoverage: FileCoverage = factory
      .create([record], '/project')
      .fileCoverageFor('/project/src/full.ts')

    // Assert
    expect(fileCoverage.s).toEqual({ 0: 3, 1: 0 })
    expect(fileCoverage.statementMap[1]).toEqual({
      start: { line: 2, column: 0 },
      end: { line: 2, column: Number.MAX_SAFE_INTEGER },
    })
    expect(fileCoverage.getLineCoverage()).toEqual({ 1: 3, 2: 0 })
  })

  it('should map functions and group branches per line and block', (): void => {
    // Act
    const fileCoverage: FileCoverage = factory
      .create([record], '/project')
      .fileCoverageFor('/project/src/full.ts')

    // Assert
    expect(fileCoverage.f).toEqual({ 0: 3, 1: 0 })
    expect(fileCoverage.fnMap[1]?.name).toBe('unused')
    expect(fileCoverage.b).toEqual({ 0: [1, 0], 1: [2] })
    expect(fileCoverage.branchMap[1]?.line).toBe(5)
  })

  it('should summarise the coverage like Istanbul does', (): void => {
    // Act
    const summary: CoverageSummary = factory.create([record], '/project').getCoverageSummary()

    // Assert
    expect(summary.lines.pct).toBe(50)
    expect(summary.functions.pct).toBe(50)
    expect(summary.branches.covered).toBe(2)
    expect(summary.branches.total).toBe(3)
  })

  it('should create an empty map for no records', (): void => {
    expect(factory.create([], '/project').files()).toEqual([])
  })
})
