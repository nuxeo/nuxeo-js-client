'use strict';

import join from '../lib/deps/utils/join';

const WS_ROOT_PATH = '/default-domain/workspaces';
const WS_JS_TEST_NAME = 'ws-js-tests';
const WS_JS_TESTS_PATH = join(WS_ROOT_PATH, WS_JS_TEST_NAME);

describe('Repository', () => {
  let nuxeo;
  let repository;

  before(() => {
    nuxeo = new Nuxeo({ auth: { username: 'Administrator', password: 'Administrator' } });
    repository = nuxeo.repository({
      schemas: ['dublincore'],
    });
  });

  describe('#fetch', () => {
    it('should fetch default domain document', () => {
      return repository.fetch('/default-domain')
        .then((doc) => {
          expect(doc.uid).to.exist();
        });
    });

    it('should returns 404 for non existing document', () => {
      return repository.fetch('/non-existing').catch((error) => {
        expect(error).to.be.not.null();
        expect(error.response.status).to.be.equal(404);
      });
    });
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
      return repository.create(WS_ROOT_PATH, newDoc).then((doc) => {
        expect(doc.uid).to.exist();
        expect(doc.path).to.be.equal(WS_JS_TESTS_PATH);
        expect(doc.type).to.be.equal('Workspace');
      });
    });
  });

  describe('#update', () => {
    it('should update document properties', () => {
      return repository.fetch(WS_JS_TESTS_PATH).then((doc) => {
        expect(doc.properties['dc:title']).to.be.equal('foo');
        doc.properties['dc:title'] = 'bar';
        return repository.update(doc);
      }).then((updatedDoc) => {
        expect(updatedDoc.properties['dc:title']).to.be.equal('bar');
      });
    });
  });

  describe('#delete', () => {
    it('should delete a document', () => {
      return repository.delete(WS_JS_TESTS_PATH).then((res) => {
        expect(res.status).to.be.equal(204);
      });
    });
  });

  describe('#query', () => {
    it('should do a NXQL query', () => {
      return repository.query({
        query: 'SELECT * FROM Document WHERE ecm:primaryType = \'Domain\'',
      })
      .then((docs) => {
        expect(docs.length).to.be.equal(1);
      });
    });

    it('should use a named page provider', () => {
      return repository.fetch('/default-domain')
        .then((doc) => {
          return repository.query({
            pageProvider: 'CURRENT_DOC_CHILDREN',
            queryParams: [doc.uid],
          });
        })
        .then((docs) => {
          expect(docs.length).to.be.equal(3);
        });
    });

    it('should handle pagination', () => {
      let docId;
      return repository.fetch('/default-domain')
        .then((doc) => {
          docId = doc.uid;
          return repository.query({
            pageProvider: 'CURRENT_DOC_CHILDREN',
            queryParams: [docId],
            pageSize: 1,
            currentPageIndex: 0,
            sortBy: 'dc:title',
            sortOrder: 'asc',
          });
        })
        .then((docs) => {
          expect(docs.length).to.be.equal(1);
          expect(docs[0].title).to.be.equal('Sections');
        })
        .then(() => {
          return repository.query({
            pageProvider: 'CURRENT_DOC_CHILDREN',
            queryParams: [docId],
            pageSize: 1,
            currentPageIndex: 1,
            sortBy: 'dc:title',
            sortOrder: 'asc',
          });
        })
        .then((docs) => {
          expect(docs.length).to.be.equal(1);
          expect(docs[0].title).to.be.equal('Templates');
        })
        .then(() => {
          return repository.query({
            pageProvider: 'CURRENT_DOC_CHILDREN',
            queryParams: [docId],
            pageSize: 1,
            currentPageIndex: 2,
            sortBy: 'dc:title',
            sortOrder: 'asc',
          });
        })
        .then((docs) => {
          expect(docs.length).to.be.equal(1);
          expect(docs[0].title).to.be.equal('Workspaces');
        });
    });
  });
});
