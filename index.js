const { readFileSync, existsSync } = require('fs');
const { writeFile, readFile, readdir, unlink, mkdir, stat } = require('fs').promises;

class FileCache {
  /**
   * @param {object|string} config - Config object or path to a JSON config file.
   * @param {string}  [config.location='.cache']  - Directory to store cache files.
   * @param {number}  [config.ttl=60]             - Default TTL in minutes.
   * @param {string}  [config.namespace=null]     - Isolates entries in a subdirectory.
   * @param {number}  [config.maxEntries=null]    - Evicts oldest entry when limit is reached.
   */
  constructor(config = {}) {
    const defaults = { location: '.cache', ttl: 60, namespace: null, maxEntries: null };

    if (typeof config === 'string') {
      if (existsSync(config)) {
        const custom = JSON.parse(readFileSync(config, 'utf8'));
        this._config = Object.assign({}, defaults, custom);
      } else {
        this._config = { ...defaults };
      }
    } else {
      this._config = Object.assign({}, defaults, config);
    }

    this._stats = { hits: 0, misses: 0, expired: 0, sets: 0, removes: 0, errors: 0 };
  }

  /**
   * Store a value in the cache. Values are JSON-serialized automatically.
   *
   * @param {string}  key
   * @param {*}       value - Any JSON-serializable value.
   * @param {number}  [ttl] - TTL in minutes. Defaults to instance config.
   * @returns {Promise<boolean>}
   */
  async set(key, value, ttl = this._config.ttl) {
    try {
      const dir = this._dir();
      await mkdir(dir, { recursive: true });

      // Remove any existing files for this key (e.g. previously set with a different TTL)
      await this._removeKeyFiles(dir, key);

      // Evict the oldest entry if we are at capacity
      if (this._config.maxEntries !== null) {
        await this._evictIfNeeded(dir);
      }

      await writeFile(`${dir}/${key}__${ttl}`, JSON.stringify(value), { encoding: 'utf8', flag: 'w' });
      this._stats.sets++;
      return true;
    } catch (err) {
      this._stats.errors++;
      return false;
    }
  }

  /**
   * Retrieve a cached value by key. Returns undefined if missing or expired.
   * Values are JSON-deserialized automatically.
   *
   * @param {string} key
   * @returns {Promise<*|undefined>}
   */
  async get(key) {
    try {
      const dir = this._dir();
      let files;

      try {
        files = await readdir(dir);
      } catch (err) {
        if (err.code === 'ENOENT') {
          this._stats.misses++;
          return undefined;
        }
        throw err;
      }

      const prefix = `${key}__`;
      const matches = files.filter(fn => {
        if (!fn.startsWith(prefix)) return false;
        return /^\d+$/.test(fn.substring(prefix.length));
      });

      if (!matches.length) {
        this._stats.misses++;
        return undefined;
      }

      let found = false;
      let value;

      for (const item of matches) {
        const ttlMinutes = parseInt(item.substring(prefix.length), 10);
        const ttlMs = ttlMinutes * 60 * 1000;
        const filePath = `${dir}/${item}`;
        const fileInfo = await stat(filePath);
        const btime = fileInfo.birthtimeMs || fileInfo.mtimeMs;
        const age = Date.now() - btime;

        if (age <= ttlMs && !found) {
          const raw = await readFile(filePath, 'utf8');
          value = JSON.parse(raw);
          found = true;
        }

        if (age > ttlMs) {
          await unlink(filePath);
          this._stats.expired++;
        }
      }

      if (!found) {
        this._stats.misses++;
        return undefined;
      }

      this._stats.hits++;
      return value;
    } catch (err) {
      this._stats.errors++;
      return undefined;
    }
  }

  /**
   * Remove a cached entry by key.
   *
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async remove(key) {
    try {
      const removed = await this._removeKeyFiles(this._dir(), key);
      if (removed) this._stats.removes++;
      return removed;
    } catch (err) {
      this._stats.errors++;
      return false;
    }
  }

  /**
   * Remove all cached entries (scoped to namespace if set).
   *
   * @returns {Promise<boolean>}
   */
  async removeAll() {
    try {
      const dir = this._dir();
      let entries;

      try {
        entries = await readdir(dir);
      } catch (err) {
        if (err.code === 'ENOENT') return true;
        throw err;
      }

      const fileEntries = await this._filterFiles(dir, entries);
      await Promise.all(fileEntries.map(item => unlink(`${dir}/${item}`)));
      return true;
    } catch (err) {
      this._stats.errors++;
      return false;
    }
  }

  /**
   * Return a snapshot of cache statistics.
   *
   * @returns {{ hits: number, misses: number, expired: number, sets: number, removes: number, errors: number }}
   */
  stats() {
    return { ...this._stats };
  }

  // ─── private ────────────────────────────────────────────────────────────────

  _dir() {
    const { location, namespace } = this._config;
    return namespace ? `${location}/${namespace}` : location;
  }

  async _removeKeyFiles(dir, key) {
    let files;
    try {
      files = await readdir(dir);
    } catch (err) {
      if (err.code === 'ENOENT') return false;
      throw err;
    }

    const prefix = `${key}__`;
    const matches = files.filter(fn => {
      if (!fn.startsWith(prefix)) return false;
      return /^\d+$/.test(fn.substring(prefix.length));
    });
    if (!matches.length) return false;

    await Promise.all(matches.map(item => unlink(`${dir}/${item}`)));
    return true;
  }

  async _filterFiles(dir, entries) {
    const withStats = await Promise.all(
      entries.map(async f => ({ name: f, s: await stat(`${dir}/${f}`) }))
    );
    return withStats.filter(f => f.s.isFile()).map(f => f.name);
  }

  async _evictIfNeeded(dir) {
    let entries;
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }

    const files = await this._filterFiles(dir, entries);
    if (files.length < this._config.maxEntries) return;

    const withStats = await Promise.all(
      files.map(async f => {
        const s = await stat(`${dir}/${f}`);
        return { name: f, btime: s.birthtimeMs || s.mtimeMs };
      })
    );
    withStats.sort((a, b) => a.btime - b.btime);

    // remove enough oldest entries so the new write will fit
    const toRemove = withStats.slice(0, files.length - this._config.maxEntries + 1);
    await Promise.all(toRemove.map(f => unlink(`${dir}/${f.name}`)));
  }
}

module.exports = FileCache;
