import { coverageMapFactory } from '@/Coverage/CoverageMapFactory'
import IstanbunError from '@/Errors/IstanbunError'
import { lcovParser } from '@/Lcov/LcovParser'
import IstanbulReportWriter from '@/Report/IstanbulReportWriter'
import { readLcovFixture } from '#test/helpers/Fixtures'
import TemporaryDirectory from '#test/helpers/TemporaryDirectory'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { CoverageMap } from 'istanbul-lib-coverage'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('@/Report/IstanbulReportWriter', (): void => {
  let directory: TemporaryDirectory

  beforeEach((): void => {
    directory = TemporaryDirectory.create()
  })

  afterEach((): void => {
    directory.remove()
  })

  it('should accept known reporter names', (): void => {
    // Arrange
    const writer: IstanbulReportWriter = IstanbulReportWriter.create(directory.path)

    // Act
    const validate: () => void = (): void => writer.validate(['json', 'cobertura', 'html'])

    // Assert
    expect(validate).not.toThrow()
  })

  it('should throw UNKNOWN_REPORTER with the valid names as hint', (): void => {
    // Arrange
    const writer: IstanbulReportWriter = IstanbulReportWriter.create(directory.path)

    // Act
    let caught: unknown = undefined
    try {
      writer.validate(['json', 'nope'])
    } catch (error) {
      caught = error
    }

    // Assert
    expect(caught).toBeInstanceOf(IstanbunError)
    expect((caught as IstanbunError).code).toBe('UNKNOWN_REPORTER')
    expect((caught as IstanbunError).message).toBe('Unknown reporter "nope"')
    expect((caught as IstanbunError).hint).toContain('text-summary')
  })

  it('should write every reporter into the output directory', (): void => {
    // Arrange
    const coverageMap: CoverageMap = coverageMapFactory.create(
      lcovParser.parse(readLcovFixture('bun.lcov')),
      '/project',
    )
    const writer: IstanbulReportWriter = IstanbulReportWriter.create(directory.path)

    // Act
    writer.write(coverageMap, ['json', 'cobertura'])

    // Assert
    const json: Record<string, unknown> = JSON.parse(
      readFileSync(join(directory.path, 'coverage-final.json'), 'utf8'),
    )
    expect(Object.keys(json)).toEqual(['/project/src/math.ts'])
    expect(existsSync(join(directory.path, 'cobertura-coverage.xml'))).toBe(true)
  })
})
