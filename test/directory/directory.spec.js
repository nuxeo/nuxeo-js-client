const { LTS_2017 } = require('../../lib/server-version');

describe('Directory', () => {
  let nuxeo;
  let dir;

  beforeAll(() => {
    nuxeo = new Nuxeo({ baseURL, auth: { method: 'basic', username: 'Administrator', password: 'Administrator' } });
    dir = nuxeo.directory('nature');
    return nuxeo.connect();
  });

  describe('#fetchAll', () => {
    it('should fetch all entries', () => (
      dir.fetchAll()
        .then((res) => {
          const { entries } = res;
          expect(entries).toBeInstanceOf(Array);
          expect(entries.length > 0).toBe(true);
        })
    ));
  });

  describe('#fetch', () => {
    it('should fetch article entry', () => (
      dir.fetch('article')
        .then((entry) => {
          expect(entry['entity-type']).toBe('directoryEntry');
          expect(entry.directoryName).toBe('nature');
          expect(entry.properties.id).toBe('article');
          expect(entry.properties.label).toBe('label.directories.nature.article');
        })
    ));

    it('should fetch article entry with a translated label', () => (
      dir.fetch('article', { translateProperties: { directoryEntry: ['label'] } })
        .then((entry) => {
          expect(entry['entity-type']).toBe('directoryEntry');
          expect(entry.directoryName).toBe('nature');
          expect(entry.properties.id).toBe('article');
          expect(entry.properties.label).toBe('Article');
        })
    ));
  });

  describe('#create', () => {
    it('should create an entry', () => {
      const newEntry = {
        properties: {
          id: 'foo',
          label: 'Foo',
        },
      };
      return dir.create(newEntry).then((entry) => {
        expect(entry['entity-type']).toBe('directoryEntry');
        expect(entry.directoryName).toBe('nature');
        expect(entry.properties.id).toBe('foo');
        expect(entry.properties.label).toBe('Foo');
      });
    });
  });

  describe('#update', () => {
    it('should update an entry', () => (
      dir.fetch('foo').then((entry) => {
        expect(entry.properties.label).toBe('Foo');
        entry.properties.label = 'Foo Fighters';
        return dir.update(entry);
      }).then((updatedEntry) => {
        expect(updatedEntry.properties.label).toBe('Foo Fighters');
      })
    ));
  });

  describe('#delete', () => {
    it('should delete an entry', () => (
      dir.delete('foo').then((res) => {
        expect(res.status).toBe(204);
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
      return dir2.update({
        id: entry.id,
        properties: {
          accessToken: 'newToken',
        },
      }).then((updatedEntry) => {
        expect(updatedEntry.properties.accessToken).toBe('newToken');
      });
    });
  });

  // NXJS-206
  it('should delete an entry with an id containing a link', () => {
    const newEntry = {
      properties: {
        id: 'http://address.com/',
        label: 'label',
      },
    };
    return dir.create(newEntry).then((entry) => {
      expect(entry['entity-type']).toBe('directoryEntry');
      expect(entry.directoryName).toBe('nature');
      expect(entry.properties.id).toBe('http://address.com/');
      expect(entry.properties.label).toBe('label');

      return dir.delete('http://address.com/').then((res) => {
        expect(res.status).toBe(204);
      });
    });
  });
});
