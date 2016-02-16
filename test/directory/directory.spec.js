'use strict';

describe('Directory', () => {
  let nuxeo;
  let dir;

  before(() => {
    nuxeo = new Nuxeo({ auth: { username: 'Administrator', password: 'Administrator' } });
    dir = nuxeo.directory('nature');
  });

  describe('#fetchAll', () => {
    it('should fetch all entries', () => {
      return dir.fetchAll()
        .then((entries) => {
          expect(entries).to.be.an.instanceof(Array);
          expect(entries.length > 0).to.be.true();
        });
    });
  });

  describe('#fetch', () => {
    it('should fetch article entry', () => {
      return dir.fetch('article')
        .then((entry) => {
          expect(entry['entity-type']).to.be.equal('directoryEntry');
          expect(entry.directoryName).to.be.equal('nature');
          expect(entry.properties.id).to.be.equal('article');
          expect(entry.properties.label).to.be.equal('label.directories.nature.article');
        });
    });
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
    it('should update an entry', () => {
      return dir.fetch('foo').then((entry) => {
        expect(entry.properties.label).to.be.equal('Foo');
        entry.properties.label = 'Foo Fighters';
        return dir.update(entry);
      }).then((updatedEntry) => {
        expect(updatedEntry.properties.label).to.be.equal('Foo Fighters');
      });
    });
  });

  describe('#delete', () => {
    it('should delete an entry', () => {
      return dir.delete('foo').then((res) => {
        expect(res.status).to.be.equal(204);
      });
    });
  });
});
