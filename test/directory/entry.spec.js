const { LTS_2017 } = require('../../lib/server-version');

const FOO_ENTRY = 'foo';

describe('DirectoryEntry', () => {
  let nuxeo;
  let dir;

  beforeAll(() => {
    nuxeo = new Nuxeo({ baseURL, auth: { method: 'basic', username: 'Administrator', password: 'Administrator' } });
    dir = nuxeo.directory('nature');

    return nuxeo.connect()
      .then(() => dir.create({ properties: { id: FOO_ENTRY } }));
  });

  afterAll(() => dir.delete('foo'));

  it('should be retrieved from a Directory', () => (
    dir.fetch(FOO_ENTRY).then((entry) => {
      expect(entry).toBeInstanceOf(Nuxeo.DirectoryEntry);
      expect(entry.directoryName).toBe('nature');
      expect(entry.properties.id).toBe('foo');
    })
  ));

  describe('#set', () => {
    it('should fill only dirtyProperties field', () => (
      dir.fetch(FOO_ENTRY).then((entry) => {
        entry.set({
          label: 'foo',
        });
        expect(entry.properties.label).toBeNull();
        expect(entry._dirtyProperties.label).toBe('foo');
      })
    ));
  });

  describe('#get', () => {
    it('should return a property value', () => (
      dir.fetch(FOO_ENTRY).then((entry) => {
        expect(entry.get('id')).toBe('foo');
      })
    ));

    it('should return undefined for non existing property', () => (
      dir.fetch(FOO_ENTRY).then((entry) => {
        expect(entry.get('non-existing')).toBeUndefined();
      })
    ));

    it('should return the dirty property value if any', () => (
      dir.fetch(FOO_ENTRY).then((entry) => {
        entry.set({
          label: 'foo',
        });
        expect(entry.get('label')).toBe('foo');
      })
    ));
  });

  describe('#save', () => {
    it('should save an updated entry', () => (
      dir.fetch(FOO_ENTRY)
        .then((entry) => {
          expect(entry.get('label')).toBeNull();
          entry.set({ label: 'Foo' });
          return entry.save();
        }).then((entry) => {
          expect(entry.get('label')).toBe('Foo');
        })
    ));
  });

  it('should update an entry with an integer id', function f() {
    if (nuxeo.serverVersion.lt(LTS_2017)) {
      this.skip();
    }

    const dir2 = nuxeo.directory('oauth2Tokens');
    return dir2.create({ properties: { accessToken: 'token' } }).then((entry) => {
      expect(entry.id).toBeDefined();
      expect(typeof entry.id).toBe('string');
      expect(typeof entry.properties.id).toBe('number');
      expect(entry.properties.accessToken).toBe('token');
      entry.set({ accessToken: 'newToken' });
      return entry.save();
    }).then((updatedEntry) => {
      expect(updatedEntry.properties.accessToken).toBe('newToken');
    });
  });
});
