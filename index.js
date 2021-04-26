const {existsSync, readFileSync,readdirSync,mkdirSync,writeFileSync,statSync,unlinkSync,utimes} = require('fs');

module.exports = {
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
  set: async (key, value, ttl = 60, location = '.cache') => {
    if(!existsSync(location)){
      mkdirSync(location, { recursive: true });
    }
    const fileName = `${key}_${ttl}`;
    await writeFileSync(`${location}/${fileName}`,value,{encoding:'utf8',flag:'w'});

    return true;
  },
  /**
   * Get cache file by key.
   *
   * @param key
   */
  get: (key) => {
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
   * Remove a cached file using its key identifier.
   *
   * @param key
   */
  remove: (key) => {
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
   * Clear all cache files
   */
  removeAll: () => {
    if(existsSync('.cache')){
      unlinkSync(`.cache`)
    }
    return true;
  }

}
