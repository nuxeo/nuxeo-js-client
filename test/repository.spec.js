/* eslint function-paren-newline: 0 */
const join = require('../lib/deps/utils/join');

const WS_ROOT_PATH = '/default-domain/workspaces';
const WS_JS_TEST_NAME = 'ws-js-tests';
const WS_JS_TESTS_PATH = join(WS_ROOT_PATH, WS_JS_TEST_NAME);

describe('Repository', () => {
  let nuxeo;
  let repository;

  beforeAll(() => {
    nuxeo = new Nuxeo({ baseURL, auth: { method: 'basic', username: 'Administrator', password: 'Administrator' } });
    repository = nuxeo.repository({
      schemas: ['dublincore'],
    });
    return nuxeo.connect();
  });

  describe('#fetch', () => {
    it('should fetch default domain document', () => (
      repository.fetch('/default-domain')
        .then((doc) => {
          expect(doc.uid).toBeDefined();
        })
    ));

    it('should returns 404 for non existing document', () => (
      repository.fetch('/non-existing')
        .then(
          () => expect.fail(null, null, 'doc should not exist'),
          (error) => {
            expect(error).not.toBeNull();
            expect(error.response.status).toBe(404);
          })
    ));
  });

  describe('#create', () => {
    it('should create a document', () => {
      const newDoc = {
        name: WS_JS_TEST_NAME,
        type: 'Workspace',
        properties: {
          'dc:title': 'foo',
        },
      };
      return repository.create(WS_ROOT_PATH, newDoc)
        .then((doc) => {
          expect(doc.uid).toBeDefined();
          expect(doc.path).toBe(WS_JS_TESTS_PATH);
          expect(doc.type).toBe('Workspace');
        });
    });
  });

  describe('#update', () => {
    it('should update document properties', () => (
      repository.fetch(WS_JS_TESTS_PATH)
        .then((doc) => {
          expect(doc.properties['dc:title']).toBe('foo');
          doc.properties['dc:title'] = 'bar';
          return repository.update(doc);
        })
        .then((updatedDoc) => {
          expect(updatedDoc.properties['dc:title']).toBe('bar');
        })
    ));
  });

  describe('#delete', () => {
    it('should delete a document', () => (
      repository.delete(WS_JS_TESTS_PATH)
        .then((res) => {
          expect(res.status).toBe(204);
        })
    ));
  });

  describe('#query', () => {
    it('should do a NXQL query', () => (
      repository.query({
        query: 'SELECT * FROM Document WHERE ecm:primaryType = \'Domain\'',
      }, {
        resolveWithFullResponse: true,
      }).then((res) => {
        expect(res.url).not.toContain('query/');
        expect(res.url).toContain('search/');
        return res.json();
      }).then((res) => {
        const {
          entries, resultsCount, currentPageSize, currentPageIndex, numberOfPages,
        } = res;
        expect(entries.length).toBe(1);
        expect(resultsCount).toBe(1);
        expect(currentPageSize).toBe(1);
        expect(currentPageIndex).toBe(0);
        expect(numberOfPages).toBe(1);
      })
    ));

    it('should use a named page provider', () => (
      repository.fetch('/default-domain')
        .then((doc) => repository.query({
          pageProvider: 'CURRENT_DOC_CHILDREN',
          queryParams: [doc.uid],
        }))
        .then((res) => {
          const {
            entries, resultsCount, currentPageSize, currentPageIndex, numberOfPages,
          } = res;
          expect(entries.length).toBe(3);
          expect(resultsCount).toBe(3);
          expect(currentPageSize).toBe(3);
          expect(currentPageIndex).toBe(0);
          expect(numberOfPages).toBe(1);
        })
    ));

    it('should handle pagination', () => {
      let docId;
      return repository.fetch('/default-domain')
        .then((doc) => {
          docId = doc.uid;
          return repository.query({
            pageProvider: 'document_content',
            queryParams: [docId],
            pageSize: 1,
            currentPageIndex: 0,
            sortBy: 'dc:title',
            sortOrder: 'asc',
          });
        })
        .then((res) => {
          const {
            entries, currentPageSize, currentPageIndex, isNextPageAvailable,
          } = res;
          expect(entries.length).toBe(1);
          expect(currentPageSize).toBe(1);
          expect(currentPageIndex).toBe(0);
          expect(isNextPageAvailable).toBe(true);
          expect(entries[0].title).toBe('Sections');
        })
        .then(() => repository.query({
          pageProvider: 'CURRENT_DOC_CHILDREN',
          queryParams: [docId],
          pageSize: 1,
          currentPageIndex: 1,
          sortBy: 'dc:title',
          sortOrder: 'asc',
        }))
        .then((res) => {
          const {
            entries, currentPageSize, currentPageIndex, isNextPageAvailable,
          } = res;
          expect(entries.length).toBe(1);
          expect(currentPageSize).toBe(1);
          expect(currentPageIndex).toBe(1);
          expect(isNextPageAvailable).toBe(true);
          expect(entries[0].title).toBe('Templates');
        })
        .then(() => repository.query({
          pageProvider: 'CURRENT_DOC_CHILDREN',
          queryParams: [docId],
          pageSize: 1,
          currentPageIndex: 2,
          sortBy: 'dc:title',
          sortOrder: 'asc',
        }))
        .then((res) => {
          const {
            entries, currentPageSize, currentPageIndex, isNextPageAvailable,
          } = res;
          expect(entries.length).toBe(1);
          expect(currentPageSize).toBe(1);
          expect(currentPageIndex).toBe(2);
          expect(isNextPageAvailable).toBe(true);
          expect(entries[0].title).toBe('Workspaces');
        })
        .then(() => repository.query({
          pageProvider: 'CURRENT_DOC_CHILDREN',
          queryParams: [docId],
          pageSize: 1,
          currentPageIndex: 3,
          sortBy: 'dc:title',
          sortOrder: 'asc',
        }))
        .then((res) => {
          const {
            entries, currentPageSize, currentPageIndex, isNextPageAvailable,
          } = res;
          expect(entries.length).toBe(0);
          expect(currentPageSize).toBe(0);
          expect(currentPageIndex).toBe(3);
          expect(isNextPageAvailable).toBe(false);
        });
    });
  });

  describe('should handle document name with reserved characters', () => {
    // TODO use 'site/api/v1/' until upgrading to 9.1
    const _nuxeo = new Nuxeo({
      baseURL,
      auth: { method: 'basic', username: 'Administrator', password: 'Administrator' },
      apiPath: 'site/api/v1/',
    });
    const _repository = _nuxeo.repository({
      schemas: ['dublincore'],
    });

    it('doc with [brackets]', () => {
      const name = 'doc with [brackets]';
      const newDoc = {
        name,
        type: 'Workspace',
        properties: {
          'dc:title': name,
        },
      };
      return _repository.create(WS_ROOT_PATH, newDoc)
        .then((doc) => _repository.fetch(doc.path))
        .then((doc) => {
          expect(doc.uid).toBeDefined();
          expect(doc.path.endsWith(name)).toBe(true);
          expect(doc.type).toBe('Workspace');
          expect(doc.get('dc:title')).toBe(name);
          return _repository.delete(doc.path);
        });
    });

    it('doc with @ and @', () => {
      const name = 'doc with @ and @';
      const newDoc = {
        name,
        type: 'Workspace',
        properties: {
          'dc:title': name,
        },
      };
      return _repository.create(WS_ROOT_PATH, newDoc)
        .then((doc) => _repository.fetch(doc.path))
        .then((doc) => {
          expect(doc.uid).toBeDefined();
          expect(doc.path.endsWith(name)).toBe(true);
          expect(doc.type).toBe('Workspace');
          expect(doc.get('dc:title')).toBe(name);
          return _repository.delete(doc.path);
        });
    });

    it('test ; doc #, $, :, ;', () => {
      const name = 'test ; doc #, $, :, ;';
      const newDoc = {
        name,
        type: 'Workspace',
        properties: {
          'dc:title': name,
        },
      };
      return _repository.create(WS_ROOT_PATH, newDoc)
        .then((doc) => _repository.fetch(doc.path))
        .then((doc) => {
          expect(doc.uid).toBeDefined();
          expect(doc.path.endsWith(name)).toBe(true);
          expect(doc.type).toBe('Workspace');
          expect(doc.get('dc:title')).toBe(name);
          return _repository.delete(doc.path);
        });
    });

    it('test ; &? and =+', () => {
      const name = 'test ; &? and =+';
      const newDoc = {
        name,
        type: 'Workspace',
        properties: {
          'dc:title': name,
        },
      };
      return _repository.create(WS_ROOT_PATH, newDoc)
        .then((doc) => _repository.fetch(doc.path))
        .then((doc) => {
          expect(doc.uid).toBeDefined();
          expect(doc.path.endsWith(name)).toBe(true);
          expect(doc.type).toBe('Workspace');
          expect(doc.get('dc:title')).toBe(name);
          return _repository.delete(doc.path);
        });
    });
  });
});
