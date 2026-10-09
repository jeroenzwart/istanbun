# Changelog

All notable changes to this project will be documented in this file.

## [1.0.3](https://github.com/jeroenzwart/istanbun/releases/tag/v1.0.3) (2026-10-09)

### Bug Fixes

- **cli:** stop .env values loaded for istanbun leaking into bun test ([4edde83](https://github.com/jeroenzwart/istanbun/commit/4edde838af23593f4a1910b2292ffd5fac9d712b))

### Continuous Integration

- **workflows:** rename CI workflow to Checks ([b9353de](https://github.com/jeroenzwart/istanbun/commit/b9353de4437cfa2829a028f90cec52ec13d43706))
## [1.0.2](https://github.com/jeroenzwart/istanbun/releases/tag/v1.0.2) (2026-10-08)

### Bug Fixes

- **cli:** forward non-istanbun arguments to bun test ([715fda0](https://github.com/jeroenzwart/istanbun/commit/715fda085c50aa5297e0a8bb72a4a477de37c7ff))

### Build System

- **deps:** add FTA to cap code complexity at 60 ([00e27bd](https://github.com/jeroenzwart/istanbun/commit/00e27bd5f83b426ed37b72f53434703ca1888a8a))
- **deps:** add Knip to report unused exports ([919d40d](https://github.com/jeroenzwart/istanbun/commit/919d40d3b1d6283141ebe780ab72f46e0916b245))
- **renovate:** automerge lock file maintenance ([ddc0952](https://github.com/jeroenzwart/istanbun/commit/ddc0952b4a73fe66144179882af597d0c2246464))
- **deps:** update to TypeScript 7 alongside the TypeScript 6 API ([bd01e7d](https://github.com/jeroenzwart/istanbun/commit/bd01e7d502badc872e8b7fca0caedf44ec1ec6fc))
- wait three days before installing or proposing new versions ([13803e2](https://github.com/jeroenzwart/istanbun/commit/13803e22074f9a3d26b951f8176258b53b500262))

### Chores

- **deps:** update dependency typescript to v7 ([71dfd4a](https://github.com/jeroenzwart/istanbun/commit/71dfd4a002b999ee315ee46209e2215c0ab1b289))
- **deps:** lock file maintenance ([c69076b](https://github.com/jeroenzwart/istanbun/commit/c69076b0138165698cdf80b1d168311d5ae12796))

### Styles

- **ci:** format the CodeQL workflow with Prettier ([5db3c2a](https://github.com/jeroenzwart/istanbun/commit/5db3c2a33f0f52a1d9ca153ee9d1d8da1bbe90a2))
## [1.0.1](https://github.com/jeroenzwart/istanbun/releases/tag/v1.0.1) (2026-10-07)

### Bug Fixes

- **renovate:** repair the invalid package rules in renovate.json ([5d21506](https://github.com/jeroenzwart/istanbun/commit/5d2150622a08664c86041dd9bfc58112bbcbda49))

### Build System

- scan dependencies with Socket's Bun security scanner ([6f984a9](https://github.com/jeroenzwart/istanbun/commit/6f984a9a4c7783ebbbf04dd88e2e4f437487cb40))
- **deps:** pin @types/bun to the minimum supported Bun version ([401b1e8](https://github.com/jeroenzwart/istanbun/commit/401b1e843f9efa88ff0f2633682d477ffc772c2b))

### Continuous Integration

- update actions to their Node 24 releases ([a493da7](https://github.com/jeroenzwart/istanbun/commit/a493da7ca207b52efa1d8c40cd5ab326f85736d3))
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
