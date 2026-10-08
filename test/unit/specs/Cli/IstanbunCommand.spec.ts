import IstanbunCommand from '@/Cli/IstanbunCommand'
import { lcovFixturePath } from '#test/helpers/Fixtures'
import TemporaryDirectory from '#test/helpers/TemporaryDirectory'
import { afterEach, beforeEach, describe, expect, it, spyOn, type Mock } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

type WriteSpy = Mock<typeof process.stdout.write>

describe('@/Cli/IstanbunCommand', (): void => {
  let directory: TemporaryDirectory
  let stdout: WriteSpy
  let stderr: WriteSpy

  /**
   * Everything written to a spied stream, joined.
   *
   * @param {WriteSpy} spy The stream spy.
   */
  function written(spy: WriteSpy): string {
    return spy.mock.calls.map((call: unknown[]): string => String(call[0])).join('')
  }

  beforeEach((): void => {
    directory = TemporaryDirectory.create()
    stdout = spyOn(process.stdout, 'write').mockImplementation((): boolean => true)
    stderr = spyOn(process.stderr, 'write').mockImplementation((): boolean => true)
  })

  afterEach((): void => {
    stdout.mockRestore()
    stderr.mockRestore()
    directory.remove()
  })

  it('should print the usage for --help and exit with 0', async (): Promise<void> => {
    // Act
    const exitCode: number = await IstanbunCommand.create(['--help']).run()

    // Assert
    expect(exitCode).toBe(0)
    expect(written(stdout)).toStartWith('Usage: istanbun')
  })

  it('should convert an lcov file with the given reporter and directory', async (): Promise<void> => {
    // Act
    const exitCode: number = await IstanbunCommand.create([
      '--lcov',
      lcovFixturePath('bun.lcov'),
      '--reporter',
      'json',
      '--output-dir',
      directory.path,
    ]).run()

    // Assert
    expect(exitCode).toBe(0)
    expect(existsSync(join(directory.path, 'coverage-final.json'))).toBe(true)
  })

  it('should print a missing option value with the usage and exit with 2', async (): Promise<void> => {
    // Act
    const exitCode: number = await IstanbunCommand.create(['--reporter']).run()

    // Assert
    expect(exitCode).toBe(2)
    expect(written(stderr)).toContain("Option '--reporter <value>' argument missing")
    expect(written(stderr)).toContain('Usage: istanbun')
  })

  it('should print a configuration error with its hint and exit with 2', async (): Promise<void> => {
    // Act
    const exitCode: number = await IstanbunCommand.create(['--reporter', 'nope']).run()

    // Assert
    expect(exitCode).toBe(2)
    expect(written(stderr)).toContain('istanbun: Unknown reporter "nope"\n  hint: Valid names:')
  })
})
