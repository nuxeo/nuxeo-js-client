const { LTS_2017 } = require('../../lib/server-version');

const FOO_ENTRY = 'foo';

describe('DirectoryEntry', () => {
  let nuxeo;
  let dir;

  before(() => {
    nuxeo = new Nuxeo({ baseURL, auth: { method: 'basic', username: 'Administrator', password: 'Administrator' } });
    dir = nuxeo.directory('nature');

    return nuxeo.connect()
      .then(() => dir.create({ properties: { id: FOO_ENTRY } }));
  });

  after(() => dir.delete('foo'));

  it('should be retrieved from a Directory', () => (
    dir.fetch(FOO_ENTRY).then((entry) => {
      expect(entry).to.be.an.instanceof(Nuxeo.DirectoryEntry);
      expect(entry.directoryName).to.be.equal('nature');
      expect(entry.properties.id).to.be.equal('foo');
    })
  ));

  describe('#set', () => {
    it('should fill only dirtyProperties field', () => (
      dir.fetch(FOO_ENTRY).then((entry) => {
        entry.set({
          label: 'foo',
        });
        expect(entry.properties.label).to.be.null();
        expect(entry._dirtyProperties.label).to.be.equal('foo');
      })
    ));
  });

  describe('#get', () => {
    it('should return a property value', () => (
      dir.fetch(FOO_ENTRY).then((entry) => {
        expect(entry.get('id')).to.be.equal('foo');
      })
    ));

    it('should return undefined for non existing property', () => (
      dir.fetch(FOO_ENTRY).then((entry) => {
        expect(entry.get('non-existing')).to.be.undefined();
      })
    ));

    it('should return the dirty property value if any', () => (
      dir.fetch(FOO_ENTRY).then((entry) => {
        entry.set({
          label: 'foo',
        });
        expect(entry.get('label')).to.be.equal('foo');
      })
    ));
  });

  describe('#save', () => {
    it('should save an updated entry', () => (
      dir.fetch(FOO_ENTRY)
        .then((entry) => {
          expect(entry.get('label')).to.be.null();
          entry.set({ label: 'Foo' });
          return entry.save();
        }).then((entry) => {
          expect(entry.get('label')).to.be.equal('Foo');
        })
    ));
  });

  it('should update an entry with an integer id', function f() {
    if (nuxeo.serverVersion.lt(LTS_2017)) {
      this.skip();
    }

    const dir2 = nuxeo.directory('oauth2Tokens');
    return dir2.create({ properties: { accessToken: 'token' } }).then((entry) => {
      expect(entry.id).to.exist();
      expect(entry.id).to.be.a('string');
      expect(entry.properties.id).to.be.a('number');
      expect(entry.properties.accessToken).to.be.equal('token');
      entry.set({ accessToken: 'newToken' });
      return entry.save();
    }).then((updatedEntry) => {
      expect(updatedEntry.properties.accessToken).to.be.equal('newToken');
    });
  });
});
