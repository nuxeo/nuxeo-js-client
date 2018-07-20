const OTHER_DOC_NAME = 'foo';
const OTHER_DOC_PATH = '/foo';

const REPOSITORY_DEFAULT = 'default';
const REPOSITORY_OTHER = 'other';

describe('Multi Repository', () => {
  let nuxeoDefault;
  let nuxeoOther;
  let repositoryDefault;
  let repositoryOther;

  before(() => {
    nuxeoDefault = new Nuxeo({ auth: { method: 'basic', username: 'Administrator', password: 'Administrator' } });
    repositoryDefault = nuxeoDefault.repository({
      schemas: ['dublincore'],
    });
    nuxeoOther = new Nuxeo({
      auth: { method: 'basic', username: 'Administrator', password: 'Administrator' },
      repositoryName: REPOSITORY_OTHER,
    });
    repositoryOther = nuxeoOther.repository({
      schemas: ['dublincore'],
    });
    return Promise.all([nuxeoDefault.connect(), nuxeoOther.connect()]);
  });

  describe('Using Repository', () => {
    it('should fetch Root document on other repository', () => (
      Promise.all([repositoryDefault.fetch('/'), repositoryOther.fetch('/')])
        .then(([rootDefault, rootOther]) => {
          expect(rootOther.uid).to.exist();
          expect(rootDefault.uid).to.exist();
          expect(rootOther.uid).to.not.equals(rootDefault.uid);
          expect(rootOther.repository).to.equals(REPOSITORY_OTHER);
          expect(rootDefault.repository).to.equals(REPOSITORY_DEFAULT);
        })
    ));

    it('should create a document on other repository', () => {
      const newOtherDoc = {
        name: OTHER_DOC_NAME,
        type: 'File',
        properties: {
          'dc:title': OTHER_DOC_NAME,
        },
      };

      return repositoryOther.fetch('/')
        .then((root) => repositoryOther.create(root.uid, newOtherDoc))
        .then((doc) => {
          expect(doc.uid).to.exist();
          expect(doc.type).to.equals('File');
          expect(doc.title).to.equals(OTHER_DOC_NAME);
          expect(doc.repository).to.equals(REPOSITORY_OTHER);
          return repositoryOther.fetch(doc.uid);
        })
        .then((doc) => (
          repositoryDefault.fetch(doc.uid)
            .then(
              () => expect.fail(null, null, 'doc should not exist in `default` repository'),
              (error) => {
                expect(error).to.be.not.null();
                expect(error.response.status).to.be.equal(404);
              })
        ));
    });

    it('should update a document on other repository', () => (
      repositoryOther.fetch(OTHER_DOC_PATH)
        .then((doc) => {
          doc.set({ 'dc:title': 'bar' });
          return doc.save();
        })
        .then((doc) => {
          expect(doc.uid).to.exist();
          expect(doc.type).to.equals('File');
          expect(doc.title).to.equals('bar');
          expect(doc.repository).to.equals(REPOSITORY_OTHER);
        })
    ));

    it('should delete a document on other repository', () => (
      repositoryOther.delete(OTHER_DOC_PATH)
        .then((res) => {
          expect(res.status).to.be.equal(204);
          return repositoryOther.fetch(OTHER_DOC_PATH);
        })
        .then(
          () => expect.fail(null, null, 'doc should not exist in `other` repository'),
          (error) => {
            expect(error).to.be.not.null();
            expect(error.response.status).to.be.equal(404);
          })
    ));
  });

  describe('Using Operation', () => {
    it('should fetch Root document on other repository', () => {
      const operationDefault = nuxeoDefault.operation('Repository.GetDocument').param('value', '/');
      const operationOther = nuxeoOther.operation('Repository.GetDocument').param('value', '/');
      return Promise.all([operationDefault.execute(), operationOther.execute()])
        .then(([rootDefault, rootOther]) => {
          expect(rootOther.uid).to.exist();
          expect(rootDefault.uid).to.exist();
          expect(rootOther.uid).to.not.equals(rootDefault.uid);
          expect(rootOther.repository).to.equals(REPOSITORY_OTHER);
          expect(rootDefault.repository).to.equals(REPOSITORY_DEFAULT);
        });
    });
  });
});
