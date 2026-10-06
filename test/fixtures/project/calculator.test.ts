import { add, sign } from './src/calculator'
import { expect, it } from 'bun:test'

it('adds', () => {
  expect(add(1, 2)).toBe(3)
})

it('detects a positive sign', () => {
  expect(sign(5)).toBe('positive')
})
