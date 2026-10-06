import type { Lcov } from '@@types/Istanbun'
import IstanbunError from '@/Errors/IstanbunError'
import LcovParser from '@/Lcov/LcovParser'
import { readLcovFixture } from '#test/helpers/Fixtures'
import { describe, expect, it } from 'bun:test'

describe('@/Lcov/LcovParser', (): void => {
  const parser: LcovParser = new LcovParser()

  it('should parse the line hits Bun writes', (): void => {
    // Act
    const records: Lcov.FileRecord[] = parser.parse(readLcovFixture('bun.lcov'))

    // Assert
    expect(records).toHaveLength(1)
    expect(records[0]?.path).toBe('src/math.ts')
    expect(records[0]?.lines.get(1)).toBe(16)
    expect(records[0]?.lines.get(4)).toBe(0)
    expect(records[0]?.lines.size).toBe(9)
    expect(records[0]?.functions).toEqual([])
    expect(records[0]?.branches).toEqual([])
  })

  it('should parse functions, branches and a DA checksum', (): void => {
    // Act
    const [record]: Lcov.FileRecord[] = parser.parse(readLcovFixture('full.lcov'))

    // Assert
    expect(record?.lines.get(1)).toBe(3)
    expect(record?.functions).toEqual([
      { name: 'sign', line: 1, hits: 3 },
      { name: 'unused', line: 10, hits: 0 },
    ])
    expect(record?.branches).toEqual([
      { line: 2, block: 0, branch: 0, hits: 1 },
      { line: 2, block: 0, branch: 1, hits: 0 },
    ])
  })

  it('should parse lcov with Windows line endings', (): void => {
    // Arrange
    const content: string = readLcovFixture('bun.lcov').replaceAll('\n', '\r\n')

    // Act
    const records: Lcov.FileRecord[] = parser.parse(content)

    // Assert
    expect(records).toHaveLength(1)
    expect(records[0]?.lines.size).toBe(9)
  })

  it('should read the name from an lcov 2.x FN line with an end line', (): void => {
    // Act
    const [record]: Lcov.FileRecord[] = parser.parse('SF:a.ts\nFN:1,5,main\nend_of_record\n')

    // Assert
    expect(record?.functions).toEqual([{ name: 'main', line: 1, hits: 0 }])
  })

  it('should create a function from FNDA when FN is missing', (): void => {
    // Act
    const [record]: Lcov.FileRecord[] = parser.parse('SF:a.ts\nFNDA:4,main\nend_of_record\n')

    // Assert
    expect(record?.functions).toEqual([{ name: 'main', line: 0, hits: 4 }])
  })

  it('should ignore unknown keys and lines outside a record', (): void => {
    // Arrange
    const content: string = 'DA:9,9\nTN:name\nSF:a.ts\nLF:1\nnoise\nDA:1,2\nend_of_record\n'

    // Act
    const records: Lcov.FileRecord[] = parser.parse(content)

    // Assert
    expect(records).toHaveLength(1)
    expect([...(records[0]?.lines ?? [])]).toEqual([[1, 2]])
  })

  it('should drop a record without end_of_record', (): void => {
    expect(parser.parse('SF:a.ts\nDA:1,1\n')).toEqual([])
  })

  it.each([['DA:x,1'], ['DA:1'], ['FN:1'], ['FNDA:1'], ['BRDA:1,0,0,x']])(
    'should throw INVALID_LCOV for the malformed line %s',
    (line: string): void => {
      // Act
      const parse: () => Lcov.FileRecord[] = (): Lcov.FileRecord[] =>
        parser.parse(`SF:a.ts\n${line}\nend_of_record\n`)

      // Assert
      expect(parse).toThrow(IstanbunError)
      expect(parse).toThrow(`Malformed lcov line "${line}"`)
    },
  )
})
