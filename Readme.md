# Node File Caching

This is a basic module for file caching with the ability to specify the time-to-live (TTL). It doesn't have any dependency as the File System is already provided by Node.



## Table of Contents

- [Why this module?](#why-this-module)
- [Notes](#notes)
- [Install](#install)
    - [get()](#get)
    - [set()](#set)
    - [remove](#remove)
    - [removeAll](#removeall)
- [License](#license)
- [Handling Errors](#handling-errors)
- [Cancellation](#cancellation)



### Why this module?

There are several good modules for file caching and some of them I've used for different projects, however, after years of working in different programming languages and mainly OOP/MVC also being used to set TTL cache I thought to put something simple in place for Node that will offer the similar opportunities. I'm using this module in production for caching pages and endpoints.

## Notes
 * This module only uses the Node File System https://nodejs.org/api/fs.html
 * Currently doesn't support custom configurations, however there's a plan to facilitate this.
 * Git repro soon will become available.

## Install
```bash
  npm i -S node-file-caching 
```

This package has 4 main methods that can be used and assumes that the defualt cache folder is `.cache` with a default TTL of 60 minutes.

### set()
This method has 2 mandatory and 2 optional parameters and you'll need to use it for setting the cache. The output of this method will be `true`.

`key` = Your own cache identifier

`value` = Value that you would like to store

`ttl` = This is optional. Is set to 60 minutes by default.

`location` = This is optional. Is set to default location of 
`.cache`, however, please don't use it as currently there's no state of configuration for persisting the cache location.

```javascript
const {set} = require('node-file-caching');

set("myCacheKey",{foo:"bar"});

```
### get()
This method has 1 mandatory parameter, called `key`, which is used to get the cache file. This method has 2 response states:

1. `false` = when the key doesn't exist of cache key doesn't have any content

2. `string` = it will return the file contents of the `key`

`key` = Cache key identifier

```javascript
const {get} = require('node-file-caching');

const cacheData = get("myCacheKey");

```

### remove()
This method has 1 mandatory parameter, called `key`, which is used to identify the cache file and remove it. This method has 2 response states:

1. `false` = when the key doesn't exist

2. `true` = when the key has been removed

`key` = Cache key identifier

```javascript
const {remove} = require('node-file-caching');

remove("myCacheKey");

```
### removeAll()
This method will clear the `.cache` folder of any files and it will return `true` as response.


## License
MIT
