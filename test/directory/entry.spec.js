const FOO_ENTRY = 'foo';

describe('DirectoryEntry', () => {
  let nuxeo;
  let dir;

  before(() => {
    nuxeo = new Nuxeo({ auth: { method: 'basic', username: 'Administrator', password: 'Administrator' } });
    dir = nuxeo.directory('nature');

    return dir.create({
      properties: {
        id: FOO_ENTRY,
      },
    });
  });

  after(() => {
    return dir.delete('foo');
  });

  it('should be retrieved from a Directory', () => {
    return dir.fetch(FOO_ENTRY).then((entry) => {
      expect(entry).to.be.an.instanceof(Nuxeo.DirectoryEntry);
      expect(entry.directoryName).to.be.equal('nature');
      expect(entry.properties.id).to.be.equal('foo');
    });
  });

  describe('#set', () => {
    it('should fill only dirtyProperties field', () => {
      return dir.fetch(FOO_ENTRY).then((entry) => {
        entry.set({
          label: 'foo',
        });
        expect(entry.properties.label).to.be.null();
        expect(entry._dirtyProperties.label).to.be.equal('foo');
      });
    });
  });

  describe('#get', () => {
    it('should return a property value', () => {
      return dir.fetch(FOO_ENTRY).then((entry) => {
        expect(entry.get('id')).to.be.equal('foo');
      });
    });

    it('should return undefined for non existing property', () => {
      return dir.fetch(FOO_ENTRY).then((entry) => {
        expect(entry.get('non-existing')).to.be.undefined();
      });
    });

    it('should return the dirty property value if any', () => {
      return dir.fetch(FOO_ENTRY).then((entry) => {
        entry.set({
          label: 'foo',
        });
        expect(entry.get('label')).to.be.equal('foo');
      });
    });
  });

  describe('#save', () => {
    it('should save an updated entry', () => {
      return dir.fetch(FOO_ENTRY)
        .then((entry) => {
          expect(entry.get('label')).to.be.null();
          entry.set({ label: 'Foo' });
          return entry.save();
        }).then((entry) => {
          expect(entry.get('label')).to.be.equal('Foo');
        });
    });
  });
});
