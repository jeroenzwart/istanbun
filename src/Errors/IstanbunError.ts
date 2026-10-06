import type { IstanbunErrorCode } from '@@types/Istanbun'

export default class IstanbunError extends Error {
  public override readonly name: string = 'IstanbunError'
  public readonly code: IstanbunErrorCode
  public readonly hint: string | undefined

  /**
   * Create an istanbun error.
   *
   * @param {IstanbunErrorCode} code Machine-readable error code.
   * @param {string} message Human-readable description.
   * @param {string} hint Optional hint on how to resolve the error.
   *
   * @public
   */
  public constructor(code: IstanbunErrorCode, message: string, hint?: string) {
    super(message)
    this.code = code
    this.hint = hint
  }
}
