const join = require('../lib/deps/utils/join');
const { createTextBlob, getTextFromBody } = require('./helpers/blob-helper');

const WS_ROOT_PATH = '/default-domain/workspaces';
const WS_JS_TEST_1_NAME = 'ws-js-tests1';
const WS_JS_TEST_2_NAME = 'ws-js-tests2';
const WS_JS_TESTS_1_PATH = join(WS_ROOT_PATH, WS_JS_TEST_1_NAME);
const WS_JS_TESTS_2_PATH = join(WS_ROOT_PATH, WS_JS_TEST_2_NAME);
const FILE_TEST_NAME = 'bar';
const FILE_TEST_PATH = join(WS_JS_TESTS_1_PATH, FILE_TEST_NAME);

describe('Operation', () => {
  let nuxeo;

  beforeAll(() => {
    nuxeo = new Nuxeo({
      baseURL,
      auth: {
        method: 'basic',
        username: 'Administrator',
        password: 'Administrator',
      },
      schemas: ['dublincore'],
    });

    const newDoc1 = {
      name: WS_JS_TEST_1_NAME,
      type: 'Workspace',
      properties: {
        'dc:title': 'foo',
      },
    };
    const newDoc2 = {
      name: WS_JS_TEST_2_NAME,
      type: 'Workspace',
      properties: {
        'dc:title': 'foo',
      },
    };
    const newDoc3 = {
      name: FILE_TEST_NAME,
      type: 'File',
      properties: {
        'dc:title': 'bar',
      },
    };

    const repository = nuxeo.repository();
    return repository.create(WS_ROOT_PATH, newDoc1)
      .then(() => repository.create(WS_ROOT_PATH, newDoc2))
      .then(() => repository.create(WS_JS_TESTS_1_PATH, newDoc3));
  });

  afterAll(() => (
    nuxeo.repository().delete(WS_JS_TESTS_1_PATH)
      .then(() => nuxeo.repository().delete(WS_JS_TESTS_2_PATH))
  ));

  it('should allow configuring operation parameters', () => {
    const op = nuxeo.operation('Noop');
    op.params({
      param1: 'foo',
      param2: 'bar',
    });
    expect(op._automationParams.params).toEqual({
      param1: 'foo',
      param2: 'bar',
    });
    op.param('param1', 'bar').param('param3', 'foo');
    expect(op._automationParams.params).toEqual({
      param1: 'bar',
      param2: 'bar',
      param3: 'foo',
    });
  });

  it('should allow configuring operation context', () => {
    const op = nuxeo.operation('Noop');
    op.context({
      currentDocument: '/',
    });
    expect(op._automationParams.context).toEqual({
      currentDocument: '/',
    });
    // replace the whole context
    op.context({
      foo: 'bar',
    });
    expect(op._automationParams.context).toEqual({
      foo: 'bar',
    });
  });

  it('should allow different operation input', () => {
    const op = nuxeo.operation('Noop');
    op.input('doc:docId');
    expect(op._automationParams.input).toBe('doc:docId');
    op.input(['dodId1', 'docId2', 'docId3']);
    expect(op._automationParams.input).toEqual(['dodId1', 'docId2', 'docId3']);
    const blob = new Nuxeo.Blob({
      content: 'foo',
      name: 'bar.txt',
      mimeType: 'plain/text',
      size: 3,
    });
    op.input(blob);
    expect(op._automationParams.input).toBeInstanceOf(Nuxeo.Blob);
    const anotherBlob = new Nuxeo.Blob({
      content: 'bar',
      name: 'foo.txt',
      mimeType: 'plain/text',
      size: 3,
    });
    op.input([blob, anotherBlob]);
    expect(op._automationParams.input).toBeInstanceOf(Array);
    expect(op._automationParams.input).toEqual([blob, anotherBlob]);
  });

  describe('#execute', () => {
    describe('should execute an operation with an input being', () => {
      it('void', () => (
        nuxeo.operation('Document.FetchByProperty')
          .params({
            property: 'dc:title',
            values: 'Workspaces',
          })
          .execute()
          .then((res) => {
            expect(res['entity-type']).toBe('documents');
            expect(res.entries.length).toBe(1);
            expect(res.entries[0].properties['dc:title']).toBe('Workspaces');
          })
      ));

      it('document path', () => (
        nuxeo.operation('Document.GetChild')
          .input('/default-domain')
          .params({
            name: 'workspaces',
          })
          .execute()
          .then((res) => {
            expect(res['entity-type']).toBe('document');
            expect(res.properties['dc:title']).toBe('Workspaces');
          })
      ));

      it('document path list', () => (
        nuxeo.operation('Document.Update')
          .input([WS_JS_TESTS_1_PATH, WS_JS_TESTS_2_PATH])
          .params({
            properties: 'dc:description=sample description',
          })
          .execute()
          .then((res) => {
            expect(res['entity-type']).toBe('documents');
            expect(res.entries.length).toBe(2);
            expect(res.entries[0].path).toBe(WS_JS_TESTS_1_PATH);
            expect(res.entries[0].properties['dc:description']).toBe('sample description');
            expect(res.entries[1].path).toBe(WS_JS_TESTS_2_PATH);
            expect(res.entries[1].properties['dc:description']).toBe('sample description');
          })
      ));

      it('document', () => (
        nuxeo.repository()
          .fetch('/default-domain')
          .then((doc) => (
            nuxeo.operation('Document.GetChild')
              .input(doc)
              .params({
                name: 'workspaces',
              })
              .execute()
          ))
          .then((res) => {
            expect(res['entity-type']).toBe('document');
            expect(res.properties['dc:title']).toBe('Workspaces');
          })
      ));

      it('document list', () => {
        const repository = nuxeo.repository();
        return nuxeo.Promise.all([repository.fetch(WS_JS_TESTS_1_PATH), repository.fetch(WS_JS_TESTS_2_PATH)])
          .then((docs) => (
            nuxeo.operation('Document.Update')
              .input(docs)
              .params({
                properties: 'dc:description=another description',
              })
              .execute()
          ))
          .then((res) => {
            expect(res['entity-type']).toBe('documents');
            expect(res.entries.length).toBe(2);
            expect(res.entries[0].path).toBe(WS_JS_TESTS_1_PATH);
            expect(res.entries[0].properties['dc:description']).toBe('another description');
            expect(res.entries[1].path).toBe(WS_JS_TESTS_2_PATH);
            expect(res.entries[1].properties['dc:description']).toBe('another description');
          });
      });

      it('non-existing document', () => (
        // fill a SimpleDocumentModel server side
        nuxeo.operation('Scripting.ReturnDocumentTitle')
          .input({
            'entity-type': 'document',
            name: 'foo',
            type: 'File',
            properties: { 'dc:title': 'Foo' },
          })
          .execute()
          .then((res) => {
            expect(res['entity-type']).toBe('string');
            expect(res.value).toBe('Foo');
          })
      ));

      it('blob', () => {
        const blob = createTextBlob('foo', 'foo.txt');
        return nuxeo.operation('Blob.AttachOnDocument')
          .param('document', FILE_TEST_PATH)
          .input(blob)
          .execute()
          .then((res) => {
            expect(res.status).toBe(200);
            return nuxeo.operation('Repository.GetDocument')
              .param('value', FILE_TEST_PATH)
              .execute({
                schemas: ['dublincore', 'file'],
              });
          })
          .then((doc) => {
            expect(doc.properties['file:content'].name).toBe('foo.txt');
          });
      });

      it('BatchUpload', () => {
        const b = nuxeo.batchUpload();

        const blob1 = createTextBlob('foo', 'foo.txt');
        const blob2 = createTextBlob('bar', 'bar.txt');

        return b.upload(blob1, blob2)
          .then(({ batch }) => (
            nuxeo.operation('FileManager.Import')
              .input(batch)
              .context({ currentDocument: WS_JS_TESTS_2_PATH })
              .execute({ schemas: ['dublincore', 'note'] })
          ))
          .then((res) => {
            expect(res['entity-type']).toBe('documents');
            expect(res.entries.length).toBe(2);
            expect(res.entries[0].title).toBe('foo.txt');
            expect(res.entries[0].type).toBe('Note');
            expect(res.entries[0].properties['note:note']).toBe('foo');
            expect(res.entries[1].title).toBe('bar.txt');
            expect(res.entries[1].type).toBe('Note');
            expect(res.entries[1].properties['note:note']).toBe('bar');
          });
      });

      it('BatchBlob', () => {
        const batch = nuxeo.batchUpload();

        const blob1 = createTextBlob('foo', 'foo.txt');
        const blob2 = createTextBlob('bar', 'bar.txt');
        batch.upload(blob1);
        return batch.upload(blob2).then(({ blob }) => (
          nuxeo.operation('FileManager.Import')
            .input(blob)
            .context({ currentDocument: WS_JS_TESTS_2_PATH })
            .execute({ schemas: ['dublincore', 'note'] })
        )).then((res) => {
          expect(res['entity-type']).toBe('document');
          expect(res.title).toBe('bar.txt');
          expect(res.type).toBe('Note');
          expect(res.properties['note:note']).toBe('bar');
        });
      });
    });

    describe('should execute an operation with an output being', () => {
      it('void', () => (
        nuxeo.operation('Log')
          .params({
            level: 'info',
            message: 'test message',
          })
          .execute()
          .then((res) => {
            expect(res.status).toBe(204);
            return res.text();
          })
          .then((text) => expect(text).toHaveLength(0))
      ));

      it('document', () => (
        nuxeo.operation('Document.GetChild')
          .input('/default-domain')
          .params({
            name: 'workspaces',
          })
          .execute()
          .then((res) => {
            expect(res).toBeInstanceOf(Nuxeo.Document);
            expect(res['entity-type']).toBe('document');
            expect(res.properties['dc:title']).toBe('Workspaces');
          })
      ));

      it('document list', () => (
        nuxeo.repository().fetch('/default-domain')
          .then((doc) => (
            nuxeo.operation('Repository.Query')
              .param('query',
                `SELECT * FROM Document WHERE ecm:parentId = '${doc.uid}'`
                + ' AND ecm:mixinType != \'HiddenInNavigation\''
                + ' AND ecm:isCheckedInVersion = 0 AND ecm:currentLifeCycleState != \'deleted\'')
              .execute()
          ))
          .then((res) => {
            expect(res['entity-type']).toBe('documents');
            expect(res.entries.length).toBe(3);
            expect(res.entries[0]).toBeInstanceOf(Nuxeo.Document);
          })
      ));

      it('blob', () => (
        nuxeo.operation('Document.GetBlob')
          .input(FILE_TEST_PATH)
          .execute()
          .then((res) => (isBrowser ? res.blob() : res.body))
          .then((body) => getTextFromBody(body))
          .then((text) => {
            expect(text).toBe('foo');
          })
      ));
    });

    // NXJS-200
    it('should not ignore headers set on the operation', () => {
      const op = nuxeo.operation('Repository.GetDocument').param('value', FILE_TEST_PATH);
      return op.execute()
        .then((res) => {
          // no thumbnail enricher header
          expect(res.contextParameters).toBeUndefined();
        })
        .then(() => op.header('enrichers-document', 'thumbnail').execute())
        .then((res) => {
          // with thumbnail enricher header
          expect(res.contextParameters.thumbnail.url).toBeDefined();
        });
    });
  });
});
