import { dlopen, FFIType, type Pointer } from 'bun:ffi'
import { readFileSync } from 'node:fs'

type KeyCheck = (key: string) => boolean

export default class DotenvCleaner {
  /**
   * Remove the keys Bun loaded from .env files when it started istanbun, so `bun test` loads
   * its own files (.env.test instead of .env.development and .env.local). Bun keeps those keys
   * in process.env only; the real process environment never contains them, so a key that is
   * missing there came from a .env file. A key that is set in both stays, so the real value
   * keeps its precedence. On other platforms, or when the check fails, nothing is removed.
   *
   * @param {NodeJS.ProcessEnv} environment The environment to clean, normally process.env.
   *
   * @public
   */
  public clean(environment: NodeJS.ProcessEnv): void {
    const isInRealEnvironment: KeyCheck | undefined = this.createRealEnvironmentCheck()
    if (isInRealEnvironment === undefined) {
      return
    }

    for (const key of Object.keys(environment)) {
      if (isInRealEnvironment(key) === false) {
        delete environment[key]
      }
    }
  }

  /**
   * Linux exposes the environment the process started with in /proc; macOS needs libc's getenv.
   *
   * @private
   */
  private createRealEnvironmentCheck(): KeyCheck | undefined {
    try {
      if (process.platform === 'linux') {
        return this.createProcEnvironmentCheck()
      }
      if (process.platform === 'darwin') {
        return this.createGetenvCheck()
      }

      return undefined
    } catch {
      // ponytail: fail open, keeping the leaked keys is the behaviour from before this cleaner
      return undefined
    }
  }

  /**
   * Check keys against /proc/self/environ, which works on glibc and musl alike.
   *
   * @private
   */
  private createProcEnvironmentCheck(): KeyCheck {
    const keys: Set<string> = new Set(
      readFileSync('/proc/self/environ', 'utf8')
        .split('\0')
        .map((entry: string): string => entry.slice(0, entry.indexOf('='))),
    )

    return (key: string): boolean => keys.has(key)
  }

  /**
   * Check keys with libc's getenv through bun:ffi.
   *
   * @private
   */
  private createGetenvCheck(): KeyCheck {
    const getenv: (name: Buffer) => bigint | Pointer | null = dlopen('libc.dylib', {
      getenv: { args: [FFIType.cstring], returns: FFIType.ptr },
    }).symbols.getenv

    return (key: string): boolean => getenv(Buffer.from(`${key}\0`)) !== null
  }
}

export const dotenvCleaner: DotenvCleaner = new DotenvCleaner()
