# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0](https://github.com/jeroenzwart/istanbun/releases/tag/v1.0.0) (2026-10-07)

### Features

- add istanbun command-line interface ([be08949](https://github.com/jeroenzwart/istanbun/commit/be08949ddc4a08b214547be59eeae39328cfd9fa))
- add Istanbun facade and public package exports ([ef20824](https://github.com/jeroenzwart/istanbun/commit/ef208246cc1a7327c5a4cac4d386210217ec22bd))
- run bun test with lcov output, optionally in watch mode ([e9d7b1b](https://github.com/jeroenzwart/istanbun/commit/e9d7b1bc34772867d73210a9f700da6e9a251df2))
- read bunfig coverage settings and plan the bun test invocation ([68da385](https://github.com/jeroenzwart/istanbun/commit/68da38550fa9a0d490763fd13660540ba7165188))
- write Istanbul reports from a coverage map ([02ab1d8](https://github.com/jeroenzwart/istanbun/commit/02ab1d8aafd3052d2005ebbedc7a6587401a1cf2))
- build Istanbul coverage maps from lcov records ([772bb7d](https://github.com/jeroenzwart/istanbun/commit/772bb7d00403a4d3775a7d6ee712e7ba8ef0bac3))
- parse lcov records including function and branch data ([181b5f6](https://github.com/jeroenzwart/istanbun/commit/181b5f69907919ce2f2a742ab8ee1f426fc8835a))
- add shared types and IstanbunError ([414ef78](https://github.com/jeroenzwart/istanbun/commit/414ef782fea90b02e32c8139f70db52662888728))

### Bug Fixes

- **runner:** return bun test's exit code when no lcov was written ([e7ee382](https://github.com/jeroenzwart/istanbun/commit/e7ee3828914051ed856cd70d13aa0f4b5f554a74))

### Documentation

- bring README and development guide up to date with CI and runner ([38daec8](https://github.com/jeroenzwart/istanbun/commit/38daec8c8ab6c8beb39e610c0ab730e8370a37a1))
- **readme:** add istanbun logo to the README header ([6da027d](https://github.com/jeroenzwart/istanbun/commit/6da027d56dfe1f8d701c31aae146fbc813f45517))
- add development guide and link it from the README ([eab5c42](https://github.com/jeroenzwart/istanbun/commit/eab5c42a3a2a5b121a47413f36b117e3fa35f713))
- add README ([3ad88bc](https://github.com/jeroenzwart/istanbun/commit/3ad88bc2c9a904414f9bf9c48d1e78711524f475))
- add istanbun design spec and implementation plan ([dfd6a44](https://github.com/jeroenzwart/istanbun/commit/dfd6a447cec9a121a1f6fb0f92562e09b0a5839d))

### Tests

- add unit tests for all modules ([8ba7d2a](https://github.com/jeroenzwart/istanbun/commit/8ba7d2a513883269d39f209c9d7d57e65c368592))

### Continuous Integration

- split the check job into parallel jobs with a shared, cached setup ([42c0bdd](https://github.com/jeroenzwart/istanbun/commit/42c0bdd8b05e0e878d75fba5612b354b781e1b7e))
- publish to npm and create a GitHub release on v* tags ([af16a55](https://github.com/jeroenzwart/istanbun/commit/af16a550d41b897d94764e788a49734cb423bb37))
- lint, typecheck, build and smoke test the CLI ([7dd6b81](https://github.com/jeroenzwart/istanbun/commit/7dd6b814f9835ded11db4311af688f3a262c1cf1))

### Chores

- add the GitHub repository to package.json ([2a77a57](https://github.com/jeroenzwart/istanbun/commit/2a77a57e12ab02a31fb3c98a528c00fdbaa7a020))
- **eslint:** enforce explicit comparisons, braces and typedefs ([0a43ca9](https://github.com/jeroenzwart/istanbun/commit/0a43ca96737e00eafa1f791528ffd9b57cb60c42))
- scaffold project with bunup, prettier and eslint ([a6550a2](https://github.com/jeroenzwart/istanbun/commit/a6550a2aa25032114e176b5dfb109c78931c353f))

### Styles

- format the Shipmark config with Prettier ([b4feb56](https://github.com/jeroenzwart/istanbun/commit/b4feb56836de2a2e67cabdef5134b89404d03070))
