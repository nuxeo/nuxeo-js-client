const { LTS_2017 } = require('../../lib/server-version');

describe('Directory', () => {
  let nuxeo;
  let dir;

  before(() => {
    nuxeo = new Nuxeo({ baseURL, auth: { method: 'basic', username: 'Administrator', password: 'Administrator' } });
    dir = nuxeo.directory('nature');
    return nuxeo.connect();
  });

  describe('#fetchAll', () => {
    it('should fetch all entries', () => (
      dir.fetchAll()
        .then((res) => {
          const { entries } = res;
          expect(entries).to.be.an.instanceof(Array);
          expect(entries.length > 0).to.be.true();
        })
    ));
  });

  describe('#fetch', () => {
    it('should fetch article entry', () => (
      dir.fetch('article')
        .then((entry) => {
          expect(entry['entity-type']).to.be.equal('directoryEntry');
          expect(entry.directoryName).to.be.equal('nature');
          expect(entry.properties.id).to.be.equal('article');
          expect(entry.properties.label).to.be.equal('label.directories.nature.article');
        })
    ));

    it('should fetch article entry with a translated label', () => (
      dir.fetch('article', { translateProperties: { directoryEntry: ['label'] } })
        .then((entry) => {
          expect(entry['entity-type']).to.be.equal('directoryEntry');
          expect(entry.directoryName).to.be.equal('nature');
          expect(entry.properties.id).to.be.equal('article');
          expect(entry.properties.label).to.be.equal('Article');
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
        expect(entry['entity-type']).to.be.equal('directoryEntry');
        expect(entry.directoryName).to.be.equal('nature');
        expect(entry.properties.id).to.be.equal('foo');
        expect(entry.properties.label).to.be.equal('Foo');
      });
    });
  });

  describe('#update', () => {
    it('should update an entry', () => (
      dir.fetch('foo').then((entry) => {
        expect(entry.properties.label).to.be.equal('Foo');
        entry.properties.label = 'Foo Fighters';
        return dir.update(entry);
      }).then((updatedEntry) => {
        expect(updatedEntry.properties.label).to.be.equal('Foo Fighters');
      })
    ));
  });

  describe('#delete', () => {
    it('should delete an entry', () => (
      dir.delete('foo').then((res) => {
        expect(res.status).to.be.equal(204);
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
      return dir2.update({
        id: entry.id,
        properties: {
          accessToken: 'newToken',
        },
      }).then((updatedEntry) => {
        expect(updatedEntry.properties.accessToken).to.be.equal('newToken');
      });
    });
  });
});
