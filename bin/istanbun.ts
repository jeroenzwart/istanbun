#!/usr/bin/env bun
import IstanbunCommand from '@/Cli/IstanbunCommand'

IstanbunCommand.create(process.argv.slice(2))
  .run()
  .then((exitCode: number): void => {
    process.exitCode = exitCode
  })
