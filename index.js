const {existsSync, readFileSync,readdirSync,mkdirSync,writeFileSync,statSync,unlinkSync,utimes} = require('fs');

const FileCache = {
  /**
   * Load config file or set default configs.
   *
   * @param configFilePath
   */
  config: (configFilePath = undefined) => {
    let defaultConfig = {
      cacheLocation: '.cache',
      ttl: 60
    };
    if (configFilePath && existsSync(configFilePath)) {
      const customConfig = readFileSync(configFilePath, 'utf8');
      Object.assign(defaultConfig, JSON.parse(customConfig));
    }
    return defaultConfig;
  },
  /**
   * Set the cache file with a default of 60 TTL
   *
   * @param key identifier
   * @param value to be stored
   * @param ttl tile to live set to a 60 min default
   */
  cacheSet: async (key, value, ttl = 60, location = '.cache') => {
    if(!existsSync(location)){
      mkdirSync(location, { recursive: true });
    }
    const fileName = `${key}_${ttl}`;
    await writeFileSync(`${location}/${fileName}`,value,{encoding:'utf8',flag:'w'});

    return true;
  },
  /**
   * Set the cache file with a default of 60 TTL
   *
   * @param key identifier
   * @param value to be stored
   * @param ttl tile to live set to a 60 min default
   * @deprecated This method will be removed.
   */
  set: async (key, value, ttl = 60, location = '.cache') => {
   return FileCache.cacheSet(key, value, ttl, location);
  },

  /**
   * Get cache file by key.
   *
   * @param key
   */
  cacheGet: (key) => {
    if(!existsSync('.cache')){
      return false;
    }
    const getFileByKey = readdirSync('.cache').filter(fn => fn.startsWith(key));
    if(!getFileByKey.length){
      return false;
    }
    let contents = null;
    getFileByKey.map( async (item) => {
      const getFileTTL = item.split("_").pop()*60*1000;
      const fileInfo = statSync(`.cache/${item}`);
      const fileCreation = fileInfo.birthtimeMs;
      const ttl =Date.now()-fileCreation;
      if(ttl <= getFileTTL && !contents){
        contents = readFileSync(`.cache/${item}`, 'utf8')
      }
      if(ttl > getFileTTL){
        unlinkSync(`.cache/${item}`)
      }
    })

    if(!contents){
      return false
    }
    return contents;
  },
  /**
   * Get cache file by key.
   *
   * @param key
   * @deprecated This method will be removed.
   */
  get: (key) => {
    return FileCache.cacheGet(key)
  },

  /**
   * Remove a cached file using its key identifier.
   *
   * @param key
   */
  cacheRemove: (key) => {
    const getFileByKey = readdirSync('.cache').filter(fn => fn.startsWith(key));
    if(!getFileByKey.length){
      return false;
    }
    getFileByKey.map(item => {
      unlinkSync(`.cache/${item}`)
    })

    return true;
  },
  /**
   * Remove a cached file using its key identifier.
   *
   * @param key
   * @deprecated This method will be removed.
   */
  remove:(key) => {
    return FileCache.cacheRemove(key);
  },
  /**
   * Clear all cache files
   */
  cacheRemoveAll: () => {
    if(!existsSync('.cache')){
      return true;
    }
    readdirSync('.cache').map(item => {
      unlinkSync(`.cache/${item}`)
    })

    return true;
  },
  /**
   * Clear all cache files
   * @deprecated This method will be removed.
   */
  removeAll: () => {
    return FileCache.cacheRemoveAll();
  }
}

module.exports = FileCache;
