const FileCache = require('./index');
const fs = require('fs');
const fsp = require('fs').promises;

const TEST_LOCATION = '/tmp/node-file-caching-test';

async function cleanDir(dir) {
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    await Promise.all(entries.map(e => {
      const full = `${dir}/${e.name}`;
      return e.isDirectory() ? fsp.rm(full, { recursive: true, force: true }) : fsp.unlink(full);
    }));
  } catch { /* dir may not exist */ }
}

describe('FileCache', () => {
  let cache;

  beforeAll(async () => {
    await cleanDir(TEST_LOCATION);
  });

  beforeEach(async () => {
    cache = new FileCache({ location: TEST_LOCATION, ttl: 60 });
    await cleanDir(TEST_LOCATION);
  });

  afterAll(async () => {
    await cleanDir(TEST_LOCATION);
    try { await fsp.rmdir(TEST_LOCATION); } catch { /* ignore */ }
  });

  // ─── constructor ────────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('uses defaults when called with no arguments', () => {
      const c = new FileCache();
      expect(c._config.location).toBe('.cache');
      expect(c._config.ttl).toBe(60);
      expect(c._config.namespace).toBeNull();
      expect(c._config.maxEntries).toBeNull();
    });

    it('merges a config object over defaults', () => {
      const c = new FileCache({ location: '/tmp/custom', ttl: 30, namespace: 'svc', maxEntries: 100 });
      expect(c._config.location).toBe('/tmp/custom');
      expect(c._config.ttl).toBe(30);
      expect(c._config.namespace).toBe('svc');
      expect(c._config.maxEntries).toBe(100);
    });

    it('loads config from a JSON file path', async () => {
      const configPath = `${TEST_LOCATION}-config.json`;
      await fsp.mkdir(TEST_LOCATION, { recursive: true });
      await fsp.writeFile(configPath, JSON.stringify({ location: '/tmp/from-file', ttl: 15 }));
      const c = new FileCache(configPath);
      expect(c._config.location).toBe('/tmp/from-file');
      expect(c._config.ttl).toBe(15);
      await fsp.unlink(configPath);
    });

    it('uses defaults when config file path does not exist', () => {
      const c = new FileCache('/nonexistent/path.json');
      expect(c._config.location).toBe('.cache');
      expect(c._config.ttl).toBe(60);
    });
  });

  // ─── set ────────────────────────────────────────────────────────────────────

  describe('set', () => {
    it('creates the cache directory if it does not exist', async () => {
      await cache.set('key', 'value');
      expect(fs.existsSync(TEST_LOCATION)).toBe(true);
    });

    it('writes a file named key__ttl', async () => {
      await cache.set('mykey', 'value', 30);
      expect(fs.existsSync(`${TEST_LOCATION}/mykey__30`)).toBe(true);
    });

    it('uses the instance default ttl when none is supplied', async () => {
      await cache.set('mykey', 'value');
      expect(fs.existsSync(`${TEST_LOCATION}/mykey__60`)).toBe(true);
    });

    it('handles keys containing underscores', async () => {
      await cache.set('my_cool_key', 'value', 45);
      expect(fs.existsSync(`${TEST_LOCATION}/my_cool_key__45`)).toBe(true);
    });

    it('removes the old file when the same key is set with a different TTL', async () => {
      await cache.set('key', 'v1', 30);
      await cache.set('key', 'v2', 60);
      expect(fs.existsSync(`${TEST_LOCATION}/key__30`)).toBe(false);
      expect(fs.existsSync(`${TEST_LOCATION}/key__60`)).toBe(true);
    });

    it('serializes objects to JSON', async () => {
      await cache.set('obj', { foo: 'bar', n: 42 });
      const raw = fs.readFileSync(`${TEST_LOCATION}/obj__60`, 'utf8');
      expect(JSON.parse(raw)).toEqual({ foo: 'bar', n: 42 });
    });

    it('returns true on success', async () => {
      expect(await cache.set('key', 'value')).toBe(true);
    });

    it('increments the sets stat', async () => {
      await cache.set('a', 1);
      await cache.set('b', 2);
      expect(cache.stats().sets).toBe(2);
    });
  });

  // ─── get ────────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('returns undefined when cache directory does not exist', async () => {
      const c = new FileCache({ location: '/tmp/nonexistent-cache-dir-xyz' });
      expect(await c.get('key')).toBeUndefined();
    });

    it('returns undefined when key does not exist', async () => {
      await cache.set('other', 'value');
      expect(await cache.get('missing')).toBeUndefined();
    });

    it('returns a stored string', async () => {
      await cache.set('hello', 'world');
      expect(await cache.get('hello')).toBe('world');
    });

    it('deserializes stored objects', async () => {
      await cache.set('obj', { a: 1, b: [2, 3] });
      expect(await cache.get('obj')).toEqual({ a: 1, b: [2, 3] });
    });

    it('correctly stores and retrieves falsy values', async () => {
      await cache.set('zero', 0);
      await cache.set('empty', '');
      await cache.set('nil', null);
      await cache.set('bool', false);
      expect(await cache.get('zero')).toBe(0);
      expect(await cache.get('empty')).toBe('');
      expect(await cache.get('nil')).toBeNull();
      expect(await cache.get('bool')).toBe(false);
    });

    it('handles keys containing underscores', async () => {
      await cache.set('my_cool_key', 'data');
      expect(await cache.get('my_cool_key')).toBe('data');
    });

    it('does not match a key that is a prefix of another key', async () => {
      await cache.set('foo', 'short');
      await cache.set('foobar', 'long');
      expect(await cache.get('foo')).toBe('short');
      expect(await cache.get('foobar')).toBe('long');
    });

    it('does not match a key whose suffix contains double underscores', async () => {
      await cache.set('foo', 'short');
      await cache.set('foo__bar', 'other');
      expect(await cache.get('foo')).toBe('short');
      expect(await cache.get('foo__bar')).toBe('other');
    });

    it('returns undefined for an expired entry', async () => {
      await cache.set('expiring', 'data', 1);
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 2 * 60 * 60 * 1000);
      expect(await cache.get('expiring')).toBeUndefined();
      jest.restoreAllMocks();
    });

    it('deletes the cache file when the entry has expired', async () => {
      await cache.set('expiring', 'data', 1);
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 2 * 60 * 60 * 1000);
      await cache.get('expiring');
      jest.restoreAllMocks();
      expect(fs.existsSync(`${TEST_LOCATION}/expiring__1`)).toBe(false);
    });

    it('increments hits on a cache hit', async () => {
      await cache.set('k', 'v');
      await cache.get('k');
      expect(cache.stats().hits).toBe(1);
    });

    it('increments misses on a cache miss', async () => {
      await cache.get('nonexistent');
      expect(cache.stats().misses).toBe(1);
    });

    it('increments expired when an entry has expired', async () => {
      await cache.set('exp', 'v', 1);
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 2 * 60 * 60 * 1000);
      await cache.get('exp');
      jest.restoreAllMocks();
      expect(cache.stats().expired).toBe(1);
    });
  });

  // ─── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('returns false when cache directory does not exist', async () => {
      const c = new FileCache({ location: '/tmp/nonexistent-cache-dir-xyz' });
      expect(await c.remove('key')).toBe(false);
    });

    it('returns false when key does not exist', async () => {
      await cache.set('other', 'value');
      expect(await cache.remove('missing')).toBe(false);
    });

    it('removes the file and returns true', async () => {
      await cache.set('toRemove', 'value');
      expect(await cache.remove('toRemove')).toBe(true);
      expect(await cache.get('toRemove')).toBeUndefined();
    });

    it('increments the removes stat', async () => {
      await cache.set('x', 'v');
      await cache.remove('x');
      expect(cache.stats().removes).toBe(1);
    });

    it('does not increment removes when key does not exist', async () => {
      await cache.remove('nonexistent');
      expect(cache.stats().removes).toBe(0);
    });
  });

  // ─── removeAll ──────────────────────────────────────────────────────────────

  describe('removeAll', () => {
    it('returns true when cache directory does not exist', async () => {
      const c = new FileCache({ location: '/tmp/nonexistent-cache-dir-xyz' });
      expect(await c.removeAll()).toBe(true);
    });

    it('clears all entries and returns true', async () => {
      await cache.set('a', '1');
      await cache.set('b', '2');
      expect(await cache.removeAll()).toBe(true);
      expect(await cache.get('a')).toBeUndefined();
      expect(await cache.get('b')).toBeUndefined();
    });
  });

  // ─── namespace ──────────────────────────────────────────────────────────────

  describe('namespace', () => {
    const NS_ROOT = '/tmp/node-file-caching-ns-test';
    const NS_A = `${NS_ROOT}/ns-a`;
    const NS_B = `${NS_ROOT}/ns-b`;

    afterEach(async () => {
      await cleanDir(NS_A);
      await cleanDir(NS_B);
    });

    afterAll(async () => {
      try { await fsp.rmdir(NS_A); } catch { /* ignore */ }
      try { await fsp.rmdir(NS_B); } catch { /* ignore */ }
      try { await fsp.rmdir(NS_ROOT); } catch { /* ignore */ }
    });

    it('stores files in a namespace subdirectory', async () => {
      const c = new FileCache({ location: NS_ROOT, namespace: 'ns-a' });
      await c.set('key', 'value');
      expect(fs.existsSync(`${NS_A}/key__60`)).toBe(true);
    });

    it('isolates entries between namespaces', async () => {
      const a = new FileCache({ location: NS_ROOT, namespace: 'ns-a' });
      const b = new FileCache({ location: NS_ROOT, namespace: 'ns-b' });
      await a.set('shared', 'from-a');
      await b.set('shared', 'from-b');
      expect(await a.get('shared')).toBe('from-a');
      expect(await b.get('shared')).toBe('from-b');
    });

    it('removeAll only clears its own namespace', async () => {
      const a = new FileCache({ location: NS_ROOT, namespace: 'ns-a' });
      const b = new FileCache({ location: NS_ROOT, namespace: 'ns-b' });
      await a.set('key', 'a-value');
      await b.set('key', 'b-value');
      await a.removeAll();
      expect(await a.get('key')).toBeUndefined();
      expect(await b.get('key')).toBe('b-value');
    });
  });

  // ─── maxEntries ─────────────────────────────────────────────────────────────

  describe('maxEntries', () => {
    it('keeps file count at maxEntries and retains the newest entry', async () => {
      const c = new FileCache({ location: TEST_LOCATION, maxEntries: 2 });
      await c.set('first', 'v1');
      await c.set('second', 'v2');
      await c.set('third', 'v3');
      const files = fs.readdirSync(TEST_LOCATION);
      expect(files.length).toBe(2);
      expect(await c.get('third')).toBe('v3');
    });

    it('does not evict when under the limit', async () => {
      const c = new FileCache({ location: TEST_LOCATION, maxEntries: 5 });
      await c.set('a', 1);
      await c.set('b', 2);
      expect(await c.get('a')).toBe(1);
      expect(await c.get('b')).toBe(2);
    });
  });

  // ─── stats ──────────────────────────────────────────────────────────────────

  describe('stats', () => {
    it('returns zeroed stats on a fresh instance', () => {
      expect(cache.stats()).toEqual({ hits: 0, misses: 0, expired: 0, sets: 0, removes: 0, errors: 0 });
    });

    it('returns a snapshot (not a live reference)', async () => {
      const snapshot = cache.stats();
      await cache.set('k', 'v');
      expect(snapshot.sets).toBe(0);
    });
  });
});
