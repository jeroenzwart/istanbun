import CoveragePlan from '@/Config/CoveragePlan'
import BunTestRunner from '@/Runner/BunTestRunner'
import { FIXTURE_PROJECT_DIRECTORY } from '#test/helpers/Fixtures'
import TemporaryDirectory from '#test/helpers/TemporaryDirectory'
import { afterEach, beforeEach, describe, expect, it, spyOn, type Mock } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const FAILING_TEST: string = [
  "import { sign } from './src/calculator'",
  "import { expect, it } from 'bun:test'",
  "it('fails', () => { expect(sign(-1)).toBe('positive') })",
].join('\n')

const PASSING_TEST_WITHOUT_SOURCES: string =
  "import { it } from 'bun:test'\nit('passes', () => {})\n"

// These specs spawn a real `bun test` in a copy of the fixture project. Watch mode is not
// covered here: it only ends on Ctrl-C, which a spec cannot send without killing itself.
describe('@/Runner/BunTestRunner', (): void => {
  let project: TemporaryDirectory
  let reported: { path: string; content: string }[]

  /**
   * Record the lcov path and content; the content must be read before the runner cleans up.
   *
   * @param {string} lcovPath The reported lcov path.
   */
  async function recordLcov(lcovPath: string): Promise<void> {
    reported.push({ path: lcovPath, content: readFileSync(lcovPath, 'utf8') })
  }

  beforeEach((): void => {
    project = TemporaryDirectory.create().copyFrom(FIXTURE_PROJECT_DIRECTORY)
    reported = []
  })

  afterEach((): void => {
    project.remove()
  })

  it('should report the lcov from a temporary directory and remove it afterwards', async (): Promise<void> => {
    // Arrange
    const plan: CoveragePlan = CoveragePlan.create({ test: {}, istanbun: {} }, {})
    const runner: BunTestRunner = BunTestRunner.create(project.path, plan, false)

    // Act
    const exitCode: number = await runner.run([], recordLcov)

    // Assert
    expect(exitCode).toBe(0)
    expect(reported).toHaveLength(1)
    expect(reported[0]?.content).toContain('SF:src/calculator.ts')
    expect(existsSync(dirname(reported[0]?.path ?? ''))).toBe(false)
  })

  it('should read the lcov from the coverageDir that bunfig pins', async (): Promise<void> => {
    // Arrange
    project.write('bunfig.toml', '[test]\ncoverageDir = "bun-coverage"\n')
    const plan: CoveragePlan = CoveragePlan.create(
      { test: { coverageDir: 'bun-coverage' }, istanbun: {} },
      {},
    )
    const runner: BunTestRunner = BunTestRunner.create(project.path, plan, false)

    // Act
    await runner.run([], recordLcov)

    // Assert
    expect(reported[0]?.path).toBe(join(project.path, 'bun-coverage', 'lcov.info'))
    expect(existsSync(join(project.path, 'bun-coverage', 'lcov.info'))).toBe(true)
  })

  it('should return the exit code of a failing bun test', async (): Promise<void> => {
    // Arrange
    project.write('failing.test.ts', FAILING_TEST)
    const plan: CoveragePlan = CoveragePlan.create({ test: {}, istanbun: {} }, {})
    const runner: BunTestRunner = BunTestRunner.create(project.path, plan, false)

    // Act
    const exitCode: number = await runner.run([], recordLcov)

    // Assert
    expect(exitCode).toBe(1)
    expect(reported).toHaveLength(1)
  })

  it('should pass the arguments to bun test', async (): Promise<void> => {
    // Arrange
    project.write('failing.test.ts', FAILING_TEST)
    const plan: CoveragePlan = CoveragePlan.create({ test: {}, istanbun: {} }, {})
    const runner: BunTestRunner = BunTestRunner.create(project.path, plan, false)

    // Act
    const exitCode: number = await runner.run(['calculator'], recordLcov)

    // Assert
    expect(exitCode).toBe(0)
  })

  it.each([
    ['a passing test that loads no source file', 'passing', PASSING_TEST_WITHOUT_SOURCES, 0],
    ['a test file with a syntax error', 'broken', 'export const = ;\n', 1],
  ])(
    'should return the exit code without reporting for %s',
    async (
      _case: string,
      name: string,
      content: string,
      expectedExitCode: number,
    ): Promise<void> => {
      // Arrange
      project.write(`${name}.test.ts`, content)
      const plan: CoveragePlan = CoveragePlan.create({ test: {}, istanbun: {} }, {})
      const runner: BunTestRunner = BunTestRunner.create(project.path, plan, false)
      const stderr: Mock<typeof process.stderr.write> = spyOn(process.stderr, 'write')

      // Act
      const exitCode: number = await runner.run([name], recordLcov)
      const messages: unknown[] = stderr.mock.calls.map((call: unknown[]): unknown => call[0])
      stderr.mockRestore()

      // Assert
      expect(exitCode).toBe(expectedExitCode)
      expect(reported).toEqual([])
      expect(messages).toEqual([
        'istanbun: bun test loaded no source files, so no reports were written\n',
      ])
    },
  )
})
