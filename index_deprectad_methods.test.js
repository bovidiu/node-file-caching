const FileCaching = require('./index');
const fs = require("fs");
describe('Validating FileCaching', () => {
  describe("set", () => {
    it('should create the default folder if none is specified', async () => {
      FileCaching.set("test","test");
      expect(fs.existsSync('.cache')).toBe(true);
    });
    it('should create the defined folder at location', async () => {
      FileCaching.set("test","test",100, '/tmp/cache_test');
      expect(fs.existsSync('/tmp/cache_test')).toBe(true);
    });
    it('should create the defined folder at location even if the path ends with a forward slash.', async () => {
      FileCaching.set("test","test",100, '/tmp/cache_tests/');
      expect(fs.existsSync('/tmp/cache_tests/')).toBe(true);
    });
    it('should create a file at the location with appended ttl', async () => {
      FileCaching.set("test","test");
      expect(fs.existsSync('.cache/test_60')).toBe(true);
    });
  })

  describe("get", () => {
    it('should return false if no file is found', async () => {
      expect( FileCaching.get("test2")).toBeFalsy();
    });
    it('should return content if file exists', async () => {
      expect( FileCaching.get("test")).toBeTruthy();
    });
  })

  describe("remove", () => {
    it('should return false if no file is found', async () => {
      expect( FileCaching.remove("test2")).toBeFalsy();
    });
    it('should return true if the file has been removed', async () => {
      expect( FileCaching.remove("test")).toBeTruthy();
    });
  })
});
