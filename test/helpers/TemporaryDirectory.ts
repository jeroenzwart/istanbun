import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export default class TemporaryDirectory {
  public readonly path: string

  /**
   * Create a fresh, empty directory in the system temp directory.
   *
   * @public
   */
  public static create(): TemporaryDirectory {
    return new TemporaryDirectory(mkdtempSync(join(tmpdir(), 'istanbun-test-')))
  }

  /**
   * Store the directory path.
   *
   * @param {string} path Absolute path of the directory.
   *
   * @public
   */
  public constructor(path: string) {
    this.path = path
  }

  /**
   * Write a file into the directory and return its absolute path.
   *
   * @param {string} fileName File name relative to the directory.
   * @param {string} content File content.
   *
   * @public
   */
  public write(fileName: string, content: string): string {
    const filePath: string = join(this.path, fileName)
    writeFileSync(filePath, content)

    return filePath
  }

  /**
   * Copy a directory's contents into this directory.
   *
   * @param {string} sourceDirectory Directory to copy from.
   *
   * @public
   */
  public copyFrom(sourceDirectory: string): this {
    cpSync(sourceDirectory, this.path, { recursive: true })

    return this
  }

  /**
   * Delete the directory and everything in it.
   *
   * @public
   */
  public remove(): void {
    rmSync(this.path, { recursive: true, force: true })
  }
}
