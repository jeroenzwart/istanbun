import type { IstanbunErrorCode, Istanbun as IstanbunTypes } from '@@types/Istanbun'
import IstanbunError from '@/Errors/IstanbunError'
import Istanbun from '@/Istanbun'
import { FIXTURE_PROJECT_DIRECTORY, lcovFixturePath } from '#test/helpers/Fixtures'
import TemporaryDirectory from '#test/helpers/TemporaryDirectory'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { CoverageMap } from 'istanbul-lib-coverage'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

describe('@/Istanbun', (): void => {
  let directory: TemporaryDirectory

  beforeEach((): void => {
    directory = TemporaryDirectory.create()
  })

  afterEach((): void => {
    directory.remove()
  })

  it('should convert an existing lcov file and notify the listener', async (): Promise<void> => {
    // Arrange
    const reportedMaps: CoverageMap[] = []
    const istanbun: Istanbun = Istanbun.create({
      workingDirectory: directory.path,
      lcovPath: lcovFixturePath('bun.lcov'),
      reporters: ['json'],
      onReport: (coverageMap: CoverageMap): void => {
        reportedMaps.push(coverageMap)
      },
    })

    // Act
    const result: IstanbunTypes.Result = await istanbun.run()

    // Assert
    expect(result.exitCode).toBe(0)
    expect(result.coverageMap.files()).toEqual([join(directory.path, 'src/math.ts')])
    expect(reportedMaps).toEqual([result.coverageMap])
    expect(existsSync(join(directory.path, 'coverage', 'coverage-final.json'))).toBe(true)
  })

  it('should take reporters and the output directory from bunfig.toml', async (): Promise<void> => {
    // Arrange
    directory.write('bunfig.toml', '[istanbun]\nreporters = ["json-summary"]\noutputDir = "out"\n')

    // Act
    await Istanbun.create({
      workingDirectory: directory.path,
      lcovPath: lcovFixturePath('bun.lcov'),
    }).run()

    // Assert
    expect(existsSync(join(directory.path, 'out', 'coverage-summary.json'))).toBe(true)
  })

  it('should run bun test and return its exit code', async (): Promise<void> => {
    // Arrange
    const project: TemporaryDirectory =
      TemporaryDirectory.create().copyFrom(FIXTURE_PROJECT_DIRECTORY)

    // Act
    const result: IstanbunTypes.Result = await Istanbun.create({
      workingDirectory: project.path,
      reporters: ['json'],
    }).run()
    project.remove()

    // Assert
    expect(result.exitCode).toBe(0)
    expect(result.coverageMap.files()).toContain(join(project.path, 'src/calculator.ts'))
  })

  it.each<[IstanbunErrorCode, IstanbunTypes.Options]>([
    ['LCOV_FILE_NOT_FOUND', { lcovPath: 'missing.info', reporters: ['json'] }],
    ['WATCH_WITH_LCOV_FILE', { lcovPath: 'lcov.info', watch: true }],
    ['UNKNOWN_REPORTER', { reporters: ['nope'] }],
  ])(
    'should throw %s',
    async (code: IstanbunErrorCode, options: IstanbunTypes.Options): Promise<void> => {
      // Act
      let caught: unknown = undefined
      try {
        await Istanbun.create({ ...options, workingDirectory: directory.path }).run()
      } catch (error) {
        caught = error
      }

      // Assert
      expect(caught).toBeInstanceOf(IstanbunError)
      expect((caught as IstanbunError).code).toBe(code)
    },
  )
})
