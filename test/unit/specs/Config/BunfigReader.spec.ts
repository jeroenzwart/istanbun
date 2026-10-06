import type { Bunfig } from '@@types/Istanbun'
import BunfigReader from '@/Config/BunfigReader'
import IstanbunError from '@/Errors/IstanbunError'
import TemporaryDirectory from '#test/helpers/TemporaryDirectory'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

describe('@/Config/BunfigReader', (): void => {
  const reader: BunfigReader = new BunfigReader()
  let directory: TemporaryDirectory

  beforeEach((): void => {
    directory = TemporaryDirectory.create()
  })

  afterEach((): void => {
    directory.remove()
  })

  it('should return empty sections when there is no bunfig.toml', (): void => {
    expect(reader.read(directory.path)).toEqual({ test: {}, istanbun: {} })
  })

  it('should read the coverage settings and the [istanbun] table', (): void => {
    // Arrange
    directory.write(
      'bunfig.toml',
      [
        '[test]',
        'coverageReporter = ["text", "lcov"]',
        'coverageDir = "reports"',
        'preload = ["./setup.ts"]',
        '',
        '[istanbun]',
        'reporters = ["html"]',
        'outputDir = "out"',
      ].join('\n'),
    )

    // Act
    const config: Bunfig.Config = reader.read(directory.path)

    // Assert
    expect(config).toEqual({
      test: { coverageReporter: ['text', 'lcov'], coverageDir: 'reports' },
      istanbun: { reporters: ['html'], outputDir: 'out' },
    })
  })

  it('should wrap a bare string reporter into a list', (): void => {
    // Arrange
    directory.write('bunfig.toml', '[test]\ncoverageReporter = "lcov"\n')

    // Act
    const config: Bunfig.Config = reader.read(directory.path)

    // Assert
    expect(config.test.coverageReporter).toEqual(['lcov'])
  })

  it('should ignore values of the wrong type', (): void => {
    // Arrange
    directory.write('bunfig.toml', 'test = 1\n[istanbun]\nreporters = ["html", 2]\noutputDir = 3\n')

    // Act
    const config: Bunfig.Config = reader.read(directory.path)

    // Assert
    expect(config).toEqual({
      test: { coverageReporter: undefined, coverageDir: undefined },
      istanbun: { reporters: ['html'], outputDir: undefined },
    })
  })

  it('should throw INVALID_BUNFIG for a file that is not TOML', (): void => {
    // Arrange
    directory.write('bunfig.toml', '[test\n')

    // Act
    const read: () => Bunfig.Config = (): Bunfig.Config => reader.read(directory.path)

    // Assert
    expect(read).toThrow(IstanbunError)
    expect(read).toThrow('Could not parse')
  })
})
