import { FIXTURE_PROJECT_DIRECTORY } from '#test/helpers/Fixtures'
import TemporaryDirectory from '#test/helpers/TemporaryDirectory'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const BIN_PATH: string = join(import.meta.dir, '..', '..', '..', '..', 'bin', 'istanbun.ts')

const ENVIRONMENT_RECORDING_TEST: string = [
  "import { it } from 'bun:test'",
  "import { writeFileSync } from 'node:fs'",
  "it('records', () => {",
  '  const { SOURCE, LOCAL_ONLY } = process.env',
  "  writeFileSync('environment.json', JSON.stringify({ SOURCE, LOCAL_ONLY }))",
  '})',
].join('\n')

type RecordedEnvironment = { SOURCE?: string; LOCAL_ONLY?: string }

// These specs run the real bin, because the keys leak between Bun's startup of istanbun and
// the spawn of `bun test`: the parent loads .env.development and .env.local, the child should
// see .env.test instead.
describe('@/Cli/DotenvCleaner', (): void => {
  let project: TemporaryDirectory

  /**
   * Run istanbun in the project without NODE_ENV, as a shell would, and read what the test saw.
   *
   * @param {Record<string, string>} extraEnvironment Variables set in the real environment.
   */
  function runIstanbun(extraEnvironment: Record<string, string> = {}): RecordedEnvironment {
    const environment: Record<string, string | undefined> = { ...process.env, ...extraEnvironment }
    delete environment.NODE_ENV
    Bun.spawnSync(['bun', BIN_PATH, './environment.test.ts'], {
      cwd: project.path,
      env: environment,
    })

    return JSON.parse(readFileSync(join(project.path, 'environment.json'), 'utf8'))
  }

  beforeEach((): void => {
    project = TemporaryDirectory.create().copyFrom(FIXTURE_PROJECT_DIRECTORY)
    project.write('.env', 'SOURCE=base\n')
    project.write('.env.development', 'SOURCE=development\n')
    project.write('.env.test', 'SOURCE=test\n')
    project.write('.env.local', 'LOCAL_ONLY=local\n')
    project.write('environment.test.ts', ENVIRONMENT_RECORDING_TEST)
  })

  afterEach((): void => {
    project.remove()
  })

  it('should give bun test the .env.test values instead of the ones Bun loaded for istanbun', (): void => {
    // Act
    const recorded: RecordedEnvironment = runIstanbun()

    // Assert
    expect(recorded).toEqual({ SOURCE: 'test' })
  })

  it('should keep a variable that is set in the real environment', (): void => {
    // Act
    const recorded: RecordedEnvironment = runIstanbun({ SOURCE: 'process' })

    // Assert
    expect(recorded).toEqual({ SOURCE: 'process' })
  })
})
