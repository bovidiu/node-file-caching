# Node File Caching
#### Cache response to local cache file
![npm](https://img.shields.io/npm/dw/node-file-caching?style=for-the-badge)

This is a basic module for file caching with the ability to specify the time-to-live (TTL). It doesn't have any dependency as the File System is already provided by Node.



## Table of Contents

- [Why this module?](#why-this-module)
- [Notes](#notes)
- [Install](#install)
    - [cacheGet](#cacheGet)
    - [cacheSet](#cacheSet)
    - [cacheRemove](#cacheRemove)
    - [cacheRemoveAll](#cacheRemoveAll)
- [Examples](#examples)
- [License](#license)



### Why this module?

There are several good modules for file caching and some of them I've used for different projects, however, after years of working in different programming languages and mainly OOP/MVC also being used to set TTL cache I thought to put something simple in place for Node that will offer the similar opportunities. I'm using this module in production for caching pages and endpoints.

## Notes
 * This module only uses the Node File System https://nodejs.org/api/fs.html
 * Currently doesn't support custom configurations, however there's a plan to facilitate this.
* The `deprecated` methods `get, set, remove, removeAll` will re removed from the files in the near feature. 

## Install
```bash
  npm i -S node-file-caching 
```

This package has 4 main methods that can be used and assumes that the defualt cache folder is `.cache` with a default TTL of 60 minutes.

### cacheSet()
This method has 2 mandatory and 2 optional parameters and you'll need to use it for setting the cache. The output of this method will be `true`.

`key` = Your own cache identifier

`value` = Value that you would like to store

`ttl` = This is optional. Is set to 60 minutes by default.

`location` = This is optional. Is set to default location of 
`.cache`, however, please don't use it as currently there's no state of configuration for persisting the cache location.

```javascript
const {cacheSet} = require('node-file-caching');

cacheSet("myCacheKey",{foo:"bar"});

```
### cacheGet()
This method has 1 mandatory parameter, called `key`, which is used to get the cache file. This method has 2 response states:

1. `false` = when the key doesn't exist of cache key doesn't have any content

2. `string` = it will return the file contents of the `key`

`key` = Cache key identifier

```javascript
const {cacheGet} = require('node-file-caching');

const cacheData = cacheGet("myCacheKey");

```

### cacheRemove()
This method has 1 mandatory parameter, called `key`, which is used to identify the cache file and remove it. This method has 2 response states:

1. `false` = when the key doesn't exist

2. `true` = when the key has been removed

`key` = Cache key identifier

```javascript
const {cacheRemove} = require('node-file-caching');

cacheRemove("myCacheKey");

```
### cacheRemoveAll()
This method will clear the `.cache` folder of any files and it will return `true` as response.


# Examples

 * Caching DB response

```javascript
const {cacheGet,cacheSet} = require('node-file-caching')

const cacheKey = "testCacheKey";
let outputData = cacheGet(cacheKey);

if(!outputData){
  const getDbData = "...";
  outputData = getDbData;
  cacheSet(cacheKey,getDbData);
}
return outputData;

```

 * Embed it as middleware (app.js)

```javascript
const {cacheGet,cacheSet} = require("node-file-caching");

// define the middleware      
app.use((req, res, next) => {
          const cacheReqKey = req.originalUrl || req.url;
          const cacheKey = cacheReqKey.replace(/(\/|\-)/g, '_');
          let getCacheData = cacheGet(cacheKey);
          if(!getCacheData){
              res.sendResponse = res.send
              res.send = (body) => {
                cacheSet(cacheKey,body);
                res.sendResponse(body)
              }
              next();
          }
          res.send( getCacheData );
      })

```

 * Embed as middleware per route

```javascript
const {cacheGet,cacheSet} = require("node-file-caching");

// define the middleware      
const cacheResponse = (req, res, next) => {
  const cacheReqKey = req.originalUrl || req.url;
  const cacheKey = cacheReqKey.replace(/(\/|\-)/g, '_');
  let getCacheData = cacheGet(cacheKey);
  if(!getCacheData){
    res.sendResponse = res.send
    res.send = (body) => {
      cacheSet(cacheKey,body);
      res.sendResponse(body)
    }
    next();
  }
  res.send( getCacheData );
}
// Your custom routing
app.get('/my-page',cacheResponse, controller.index);
```

## Issues
For any issues, concerns, features or general talk on github any time.

* [Issue/bug](https://github.com/bovidiu/node-file-caching/issues/new?assignees=&labels=&template=bug_report.md&title=)  
* [Feature request](https://github.com/bovidiu/node-file-caching/issues/new?assignees=&labels=&template=feature_request.md&title=)
* [General discussions](https://github.com/bovidiu/node-file-caching/discussions)

## License
MIT
