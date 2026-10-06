import { defineConfig } from 'bunup'

export default defineConfig({
  entry: ['src/index.ts', 'bin/istanbun.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  target: 'bun',
  clean: true,
})
