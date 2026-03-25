# Node File Caching
#### Cache responses to local files with TTL, namespaces, and entry limits

![npm](https://img.shields.io/npm/dw/node-file-caching?style=for-the-badge)
![npm version](https://img.shields.io/npm/v/node-file-caching?style=for-the-badge)
![License](https://img.shields.io/npm/l/node-file-caching?style=for-the-badge)
![Node](https://img.shields.io/node/v/node-file-caching?style=for-the-badge)
![CI](https://img.shields.io/github/actions/workflow/status/bovidiu/node-file-caching/ci.yml?branch=main&label=CI&style=for-the-badge)

Zero-dependency file caching for Node.js. Uses only the built-in File System module. Designed for platform and engineering teams that need a flexible, instance-based cache with TTL enforcement, namespace isolation, entry limits, and observability via stats.

## Table of Contents

- [Install](#install)
- [Quick start](#quick-start)
- [Module systems](#module-systems)
- [Configuration](#configuration)
- [API](#api)
  - [set](#setkey-value-ttl)
  - [get](#getkey)
  - [remove](#removekey)
  - [removeAll](#removeall)
  - [stats](#stats)
- [Examples](#examples)
- [TypeScript](#typescript)
- [Issues](#issues)
- [License](#license)

## Install

```bash
npm i -S node-file-caching
```

## Quick start

```javascript
// CommonJS
const FileCache = require('node-file-caching');

// ES Modules
import FileCache from 'node-file-caching';

const cache = new FileCache({ location: '.cache', ttl: 60 });

await cache.set('myKey', { foo: 'bar' });

const data = await cache.get('myKey');
// { foo: 'bar' }  — or undefined if missing / expired
```

## Module systems

The package ships both a CommonJS build and an ESM wrapper, so it works in any Node.js project regardless of the `"type"` field in your `package.json`.

**CommonJS** (default for `.js` files without `"type": "module"`)

```javascript
const FileCache = require('node-file-caching');
```

**ES Modules** (`.mjs` files, or `.js` files in a `"type": "module"` package)

```javascript
import FileCache from 'node-file-caching';
```

**TypeScript** (works with both `"module": "CommonJS"` and `"module": "ESNext"` / `"NodeNext"`)

```typescript
import FileCache from 'node-file-caching';
import type { FileCacheConfig, FileCacheStats } from 'node-file-caching';
```

Node.js 14.14+ is required for both module systems.

## Configuration

Pass a config object or a path to a JSON config file to the constructor.

```javascript
// Config object
const cache = new FileCache({
  location: '.cache',   // directory to store cache files (default: '.cache')
  ttl: 60,              // default TTL in minutes (default: 60)
  namespace: 'api',     // isolates entries under location/namespace/ (default: null)
  maxEntries: 500,      // evicts oldest entry when limit is reached (default: null = unlimited)
});

// From a JSON config file
const cache = new FileCache('/path/to/cache.config.json');

// All defaults
const cache = new FileCache();
```

**`namespace`** is the key option for platform use: multiple services sharing the same host can point to the same `location` with different namespaces and their entries will never collide.

**`maxEntries`** prevents unbounded disk growth in long-running services. When the limit is reached, the oldest file (by creation time) is evicted before the new entry is written.

## API

All methods except `stats()` return a Promise.

---

### `set(key, value, ttl?)`

Store any JSON-serializable value. Returns `true` on success, `false` on error.

- `key` — cache identifier
- `value` — any JSON-serializable value (object, array, string, number, boolean, null)
- `ttl` — TTL in minutes, overrides the instance default

```javascript
await cache.set('user:42', { name: 'Alice', role: 'admin' });

// Custom TTL
await cache.set('rate-limit:ip', count, 1); // expires in 1 minute
```

---

### `get(key)`

Retrieve a cached value. Returns the deserialized value, or `undefined` if the entry is missing or expired. Expired entries are deleted from disk on read.

Using `undefined` as the miss sentinel means all JSON-serializable values — including `false`, `null`, `0`, and `""` — can be stored and retrieved unambiguously.

```javascript
const user = await cache.get('user:42');

if (user === undefined) {
  // cache miss — fetch from source
}

// falsy values are safe to cache
await cache.set('flag', false);
const flag = await cache.get('flag'); // false (hit), not undefined (miss)
```

---

### `remove(key)`

Remove an entry by key. Returns `true` if removed, `false` if not found.

```javascript
await cache.remove('user:42');
```

---

### `removeAll()`

Remove all entries (scoped to the instance's namespace if set). Returns `true`.

```javascript
await cache.removeAll();
```

---

### `stats()`

Returns a synchronous snapshot of cache activity since the instance was created.

```javascript
const { hits, misses, expired, sets, errors } = cache.stats();
```

| Field | Description |
|---|---|
| `hits` | Successful `get` calls that returned a value |
| `misses` | `get` calls that returned `undefined` (missing or expired) |
| `expired` | Files deleted due to TTL expiry during `get` |
| `sets` | Successful `set` calls |
| `removes` | Successful `remove` calls |
| `errors` | Filesystem errors caught across all methods |

## Examples

### Caching a database response

```javascript
const FileCache = require('node-file-caching');

const cache = new FileCache({ location: '.cache', ttl: 10 });

async function getUser(id) {
  const cacheKey = `user:${id}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  await cache.set(cacheKey, user);
  return user;
}
```

### Global Express middleware

```javascript
const FileCache = require('node-file-caching');

const cache = new FileCache({ location: '.cache', ttl: 5, maxEntries: 1000 });

app.use(async (req, res, next) => {
  const cacheKey = (req.originalUrl || req.url).replace(/[\\/\-]/g, '_');
  const cached = await cache.get(cacheKey);

  if (cached) {
    return res.send(cached);
  }

  res.sendResponse = res.send;
  res.send = async (body) => {
    await cache.set(cacheKey, body);
    res.sendResponse(body);
  };
  next();
});
```

### Per-route middleware

```javascript
const FileCache = require('node-file-caching');

const cache = new FileCache({ location: '.cache', ttl: 5 });

const cacheResponse = async (req, res, next) => {
  const cacheKey = (req.originalUrl || req.url).replace(/[\\/\-]/g, '_');
  const cached = await cache.get(cacheKey);

  if (cached) {
    return res.send(cached);
  }

  res.sendResponse = res.send;
  res.send = async (body) => {
    await cache.set(cacheKey, body);
    res.sendResponse(body);
  };
  next();
};

app.get('/my-page', cacheResponse, controller.index);
```

### Multiple isolated caches on the same host

```javascript
const FileCache = require('node-file-caching');

const sharedRoot = '/var/cache/myapp';

const apiCache = new FileCache({ location: sharedRoot, namespace: 'api',      ttl: 5  });
const dbCache  = new FileCache({ location: sharedRoot, namespace: 'database', ttl: 60 });
const authCache = new FileCache({ location: sharedRoot, namespace: 'auth',    ttl: 1, maxEntries: 10000 });
```

### Monitoring cache health

```javascript
setInterval(() => {
  const s = cache.stats();
  const hitRate = s.hits / (s.hits + s.misses) || 0;
  console.log(`Cache hit rate: ${(hitRate * 100).toFixed(1)}% | errors: ${s.errors}`);
}, 60_000);
```

## TypeScript

Type definitions are included for both CommonJS and ESM. No additional packages required.

```typescript
import FileCache from 'node-file-caching';
import type { FileCacheConfig, FileCacheStats } from 'node-file-caching';

const config: FileCacheConfig = { location: '.cache', ttl: 60 };
const cache = new FileCache(config);

// Typed get
const user = await cache.get<{ name: string; role: string }>('user:42');
if (user) {
  console.log(user.name);
}

// Stats
const s: FileCacheStats = cache.stats();
```

Works with `"module": "CommonJS"`, `"ESNext"`, and `"NodeNext"` in `tsconfig.json`.

## Issues

* [Report a bug](https://github.com/bovidiu/node-file-caching/issues/new?assignees=&labels=&template=bug_report.md&title=)
* [Request a feature](https://github.com/bovidiu/node-file-caching/issues/new?assignees=&labels=&template=feature_request.md&title=)
* [General discussions](https://github.com/bovidiu/node-file-caching/discussions)

## License

MIT
