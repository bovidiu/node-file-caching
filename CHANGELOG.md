# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-03-25

### Breaking changes

- **Class-based API**: `FileCache` is now a class. Replace `const { cacheSet } = require('node-file-caching')` with `const FileCache = require('node-file-caching'); const cache = new FileCache(config)`.
- **All methods are now async**: `get`, `remove`, and `removeAll` now return Promises — `await` them.
- **JSON serialization**: Values are automatically `JSON.stringify`-ed on write and `JSON.parse`-d on read. Cache files written by v1 are not compatible.
- **Method rename**: `cacheSet/cacheGet/cacheRemove/cacheRemoveAll` are now `set/get/remove/removeAll` on the instance.
- **Deprecated aliases removed**: `set`, `get`, `remove`, `removeAll` top-level exports from v1 are gone.

### Added

- `namespace` config option — isolates cache entries in a subdirectory, preventing key collisions between services sharing the same cache root.
- `maxEntries` config option — evicts the oldest entry when the limit is reached, preventing unbounded disk growth.
- `stats()` method — returns a snapshot of `{ hits, misses, expired, sets, errors }`.
- `index.d.ts` — full TypeScript type definitions including a generic `get<T>` return type.
- Error handling throughout — all methods catch filesystem errors and return `false` instead of throwing.
- `set` now removes any existing file for the same key before writing, so changing a key's TTL does not leave orphan files.

### Changed

- `set` is now truly async using `fs.promises.writeFile` (previously used `await writeFileSync` which was a no-op).
- `get`, `remove`, and `removeAll` all use `fs.promises` APIs — no more synchronous file I/O blocking the event loop.
- TTL file separator changed from single `_` to double `__` — fixes incorrect TTL parsing when cache keys contain underscores.
- `get`, `remove`, and `removeAll` use `readdir` with ENOENT handling instead of `existsSync` — avoids TOCTOU race conditions.
- `removeAll` and `maxEntries` eviction now skip subdirectories — safe to use alongside namespaced caches sharing the same root.

## [1.x]

Initial releases. Single-object API (`cacheSet`, `cacheGet`, `cacheRemove`, `cacheRemoveAll`) with synchronous file reads and no configuration persistence.
