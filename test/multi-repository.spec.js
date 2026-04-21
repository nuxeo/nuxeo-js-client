/* eslint function-paren-newline: 0 */
const OTHER_DOC_NAME = 'foo';
const OTHER_DOC_PATH = '/foo';

const REPOSITORY_DEFAULT = 'default';
const REPOSITORY_OTHER = 'other';

describe('Multi Repository', () => {
  let nuxeoDefault;
  let nuxeoOther;
  let repositoryDefault;
  let repositoryOther;

  beforeAll(() => {
    nuxeoDefault = new Nuxeo({
      baseURL,
      auth: { method: 'basic', username: 'Administrator', password: 'Administrator' },
    });
    repositoryDefault = nuxeoDefault.repository({
      schemas: ['dublincore'],
    });
    nuxeoOther = new Nuxeo({
      baseURL,
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
          expect(rootOther.uid).toBeDefined();
          expect(rootDefault.uid).toBeDefined();
          expect(rootOther.uid).not.toBe(rootDefault.uid);
          expect(rootOther.repository).toBe(REPOSITORY_OTHER);
          expect(rootDefault.repository).toBe(REPOSITORY_DEFAULT);
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
          expect(doc.uid).toBeDefined();
          expect(doc.type).toBe('File');
          expect(doc.title).toBe(OTHER_DOC_NAME);
          expect(doc.repository).toBe(REPOSITORY_OTHER);
          return repositoryOther.fetch(doc.uid);
        })
        .then((doc) => (
          repositoryDefault.fetch(doc.uid)
            .then(
              () => expect.fail(null, null, 'doc should not exist in `default` repository'),
              (error) => {
                expect(error).not.toBeNull();
                expect(error.response.status).toBe(404);
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
          expect(doc.uid).toBeDefined();
          expect(doc.type).toBe('File');
          expect(doc.title).toBe('bar');
          expect(doc.repository).toBe(REPOSITORY_OTHER);
        })
    ));

    it('should delete a document on other repository', () => (
      repositoryOther.delete(OTHER_DOC_PATH)
        .then((res) => {
          expect(res.status).toBe(204);
          return repositoryOther.fetch(OTHER_DOC_PATH);
        })
        .then(
          () => expect.fail(null, null, 'doc should not exist in `other` repository'),
          (error) => {
            expect(error).not.toBeNull();
            expect(error.response.status).toBe(404);
          })
    ));
  });

  describe('Using Operation', () => {
    it('should fetch Root document on other repository', () => {
      const operationDefault = nuxeoDefault.operation('Repository.GetDocument').param('value', '/');
      const operationOther = nuxeoOther.operation('Repository.GetDocument').param('value', '/');
      return Promise.all([operationDefault.execute(), operationOther.execute()])
        .then(([rootDefault, rootOther]) => {
          expect(rootOther.uid).toBeDefined();
          expect(rootDefault.uid).toBeDefined();
          expect(rootOther.uid).not.toBe(rootDefault.uid);
          expect(rootOther.repository).toBe(REPOSITORY_OTHER);
          expect(rootDefault.repository).toBe(REPOSITORY_DEFAULT);
        });
    });
  });
});
