#!/usr/bin/env bun
import { dotenvCleaner } from '@/Cli/DotenvCleaner'
import IstanbunCommand from '@/Cli/IstanbunCommand'

dotenvCleaner.clean(process.env)

IstanbunCommand.create(process.argv.slice(2))
  .run()
  .then((exitCode: number): void => {
    process.exitCode = exitCode
  })
