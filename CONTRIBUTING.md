# Contributing

Contributions are welcome — bug fixes, new features, and documentation improvements.

## Getting started

```bash
git clone https://github.com/bovidiu/node-file-caching.git
cd node-file-caching
npm install
```

## Running tests

```bash
# Run the full test suite
npm run test:unit

# Watch mode during development
npm run test:watch

# With coverage report
npm run test:coverage
```

## Linting

```bash
npm run lint
```

A pre-commit hook runs lint and tests automatically before each commit.

## Branching

| Branch pattern | Purpose |
|---|---|
| `main` | Stable, released code |
| `feat/<short-description>` | New features |
| `fix/<short-description>` | Bug fixes |
| `docs/<short-description>` | Documentation only |
| `chore/<short-description>` | Tooling, deps, CI |

Always branch from `main` and open your PR back to `main`.

## Pull requests

- Keep PRs focused — one feature or fix per PR.
- All existing tests must pass and new behaviour must be covered by tests.
- Update `CHANGELOG.md` under an `[Unreleased]` section describing your change.
- For breaking changes, bump the major version in `package.json` and clearly note the migration path in the changelog.

## Commit messages

Use the imperative mood and keep the first line under 72 characters:

```
Add namespace isolation support
Fix TTL parsing for keys containing underscores
Update CI to test against Node 18, 20, and 22
```

## Reporting bugs

Use the [bug report template](https://github.com/bovidiu/node-file-caching/issues/new?template=bug_report.md).

## Requesting features

Use the [feature request template](https://github.com/bovidiu/node-file-caching/issues/new?template=feature_request.md).
