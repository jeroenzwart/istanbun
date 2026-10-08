import type { Cli } from '@@types/Istanbun'
import ArgumentParser from '@/Cli/ArgumentParser'
import { describe, expect, it } from 'bun:test'

describe('@/Cli/ArgumentParser', (): void => {
  it('should forward an unknown option whose leading -- was dropped by Bun', (): void => {
    // Act
    const parsed: Cli.Arguments = ArgumentParser.parse(['--isolate'])

    // Assert
    expect(parsed.bunTestArguments).toEqual(['--isolate'])
  })

  it('should forward positionals and options in their original order', (): void => {
    // Act
    const parsed: Cli.Arguments = ArgumentParser.parse(['test/unit', '--bail'])

    // Assert
    expect(parsed.bunTestArguments).toEqual(['test/unit', '--bail'])
  })

  it('should parse istanbun options before a surviving separator', (): void => {
    // Act
    const parsed: Cli.Arguments = ArgumentParser.parse(['--reporter', 'html', '--', '--isolate'])

    // Assert
    expect(parsed.values.reporter).toEqual(['html'])
    expect(parsed.bunTestArguments).toEqual(['--isolate'])
  })

  it('should keep the separate value of a forwarded option', (): void => {
    // Act
    const parsed: Cli.Arguments = ArgumentParser.parse(['--timeout', '5000'])

    // Assert
    expect(parsed.bunTestArguments).toEqual(['--timeout', '5000'])
  })

  it('should keep the inline value of a forwarded option', (): void => {
    // Act
    const parsed: Cli.Arguments = ArgumentParser.parse(['--timeout=5000'])

    // Assert
    expect(parsed.bunTestArguments).toEqual(['--timeout=5000'])
  })

  it('should forward istanbun option names after a surviving separator verbatim', (): void => {
    // Act
    const parsed: Cli.Arguments = ArgumentParser.parse(['--', '--reporter', 'junit'])

    // Assert
    expect(parsed.values.reporter).toBeUndefined()
    expect(parsed.bunTestArguments).toEqual(['--reporter', 'junit'])
  })

  it('should parse istanbun options mixed with forwarded arguments', (): void => {
    // Act
    const parsed: Cli.Arguments = ArgumentParser.parse([
      '--isolate',
      '--reporter=json',
      'test/unit',
      '--output-dir',
      'reports',
      '--watch',
    ])

    // Assert
    expect(parsed.values).toEqual({ 'reporter': ['json'], 'output-dir': 'reports', 'watch': true })
    expect(parsed.bunTestArguments).toEqual(['--isolate', 'test/unit'])
  })

  it('should throw a parse error for an istanbun option without its value', (): void => {
    // Act
    const parse: () => Cli.Arguments = (): Cli.Arguments => ArgumentParser.parse(['--reporter'])

    // Assert
    expect(parse).toThrow(expect.objectContaining({ code: 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE' }))
  })
})
