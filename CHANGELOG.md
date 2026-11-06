# Changelog

## 0.1.1 (unreleased)

- Update the packaging dependency to fix the minimatch denial-of-service advisory GHSA-g3hv-75wg-m249.
- Pin CI actions to immutable commits and check dependencies for known vulnerabilities.
- Bound VSIX inspection memory usage and validate XML identity structurally, rejecting ambiguous identities and DTDs.
- Add regression tests for malformed and oversized packages. Theme colors and visual assets are unchanged.

## 0.1.0

- Establish the independent `atreyu-94.noctis2` identity.
- Migrate the generator to TypeScript; add semantic highlighting and Typst/Julia refinements while preserving all 11 palettes.
- Require VS Code 1.81, update workbench color keys and correct Lilac metadata/validation defects using existing colors.
- Add Windows/Linux validation and inspected VSIX packaging.
- Retain the original graphics, MIT license and attribution to Liviu Schera and upstream contributors.

Earlier releases belong to Noctis. See the [original changelog](https://github.com/liviuschera/noctis/blob/master/CHANGELOG.md) for that history.
