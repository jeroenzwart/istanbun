import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const FIXTURES_DIRECTORY: string = join(import.meta.dir, '..', 'fixtures')

export const FIXTURE_PROJECT_DIRECTORY: string = join(FIXTURES_DIRECTORY, 'project')

/**
 * Absolute path of an lcov fixture.
 *
 * @param {string} fileName File name inside test/fixtures/lcov.
 */
export function lcovFixturePath(fileName: string): string {
  return join(FIXTURES_DIRECTORY, 'lcov', fileName)
}

/**
 * Content of an lcov fixture.
 *
 * @param {string} fileName File name inside test/fixtures/lcov.
 */
export function readLcovFixture(fileName: string): string {
  return readFileSync(lcovFixturePath(fileName), 'utf8')
}
