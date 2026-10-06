import type { Bunfig } from '@@types/Istanbun'
import CoveragePlan from '@/Config/CoveragePlan'
import IstanbunError from '@/Errors/IstanbunError'
import { describe, expect, it } from 'bun:test'

const EMPTY_BUNFIG: Bunfig.Config = { test: {}, istanbun: {} }

describe('@/Config/CoveragePlan', (): void => {
  it('should fall back to the text reporter and the coverage directory', (): void => {
    // Act
    const plan: CoveragePlan = CoveragePlan.create(EMPTY_BUNFIG, {})

    // Assert
    expect(plan.reporters).toEqual(['text'])
    expect(plan.outputDirectory).toBe('coverage')
    expect(plan.lcovDirectory).toBeUndefined()
    expect(plan.bunTestFlags).toEqual(['--coverage', '--coverage-reporter=lcov'])
  })

  it('should prefer the options over [istanbun] over [test].coverageDir', (): void => {
    // Arrange
    const bunfig: Bunfig.Config = {
      test: { coverageDir: 'bun-coverage' },
      istanbun: { reporters: ['html'], outputDir: 'istanbun-coverage' },
    }

    // Act
    const fromOptions: CoveragePlan = CoveragePlan.create(bunfig, {
      reporters: ['json'],
      outputDirectory: 'cli-coverage',
    })
    const fromIstanbunTable: CoveragePlan = CoveragePlan.create(bunfig, {})
    const fromTestTable: CoveragePlan = CoveragePlan.create(
      { test: { coverageDir: 'bun-coverage' }, istanbun: {} },
      {},
    )

    // Assert
    expect(fromOptions.reporters).toEqual(['json'])
    expect(fromOptions.outputDirectory).toBe('cli-coverage')
    expect(fromIstanbunTable.reporters).toEqual(['html'])
    expect(fromIstanbunTable.outputDirectory).toBe('istanbun-coverage')
    expect(fromTestTable.outputDirectory).toBe('bun-coverage')
  })

  it('should read lcov from [test].coverageDir because it overrides --coverage-dir', (): void => {
    // Act
    const plan: CoveragePlan = CoveragePlan.create(
      { test: { coverageDir: 'bun-coverage' }, istanbun: {} },
      { outputDirectory: 'cli-coverage' },
    )

    // Assert
    expect(plan.lcovDirectory).toBe('bun-coverage')
  })

  it('should only pass --coverage when bunfig already includes lcov', (): void => {
    // Act
    const plan: CoveragePlan = CoveragePlan.create(
      { test: { coverageReporter: ['text', 'lcov'] }, istanbun: {} },
      {},
    )

    // Assert
    expect(plan.bunTestFlags).toEqual(['--coverage'])
  })

  it('should throw LCOV_REPORTER_NOT_CONFIGURED when bunfig pins reporters without lcov', (): void => {
    // Arrange
    const bunfig: Bunfig.Config = { test: { coverageReporter: ['text'] }, istanbun: {} }

    // Act
    const create: () => CoveragePlan = (): CoveragePlan => CoveragePlan.create(bunfig, {})

    // Assert
    expect(create).toThrow(IstanbunError)
    expect(create).toThrow('without "lcov"')
  })

  it('should accept bunfig reporters without lcov when converting an lcov file', (): void => {
    // Act
    const plan: CoveragePlan = CoveragePlan.create(
      { test: { coverageReporter: ['text'] }, istanbun: {} },
      { lcovPath: 'lcov.info' },
    )

    // Assert
    expect(plan.bunTestFlags).toEqual(['--coverage'])
  })

  it('should throw INVALID_REPORTER_LIST for an empty reporter list', (): void => {
    expect((): CoveragePlan => CoveragePlan.create(EMPTY_BUNFIG, { reporters: [] })).toThrow(
      'At least one reporter is required',
    )
  })
})
