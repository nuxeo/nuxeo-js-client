const contentDisposition = require('content-disposition');

const join = require('../lib/deps/utils/join');
const { LTS_2016 } = require('../lib/server-version');
const { createTextBlob } = require('./helpers/blob-helper');

const WS_ROOT_PATH = '/default-domain/workspaces';
const WS_JS_TEST_NAME = 'ws-js-tests1';
const WS_JS_TESTS_PATH = join(WS_ROOT_PATH, WS_JS_TEST_NAME);
const FILE_TEST_NAME = 'bar';
const FILE_TEST_PATH = join(WS_JS_TESTS_PATH, FILE_TEST_NAME);

describe('UTF-8 filenames spec', () => {
  let nuxeo;

  before(() => {
    nuxeo = new Nuxeo({
      auth: {
        method: 'basic',
        username: 'Administrator',
        password: 'Administrator',
      },
      schemas: ['dublincore', 'file'],
    });

    const ws = {
      name: WS_JS_TEST_NAME,
      type: 'Workspace',
      properties: {
        'dc:title': 'foo',
      },
    };
    const file = {
      name: FILE_TEST_NAME,
      type: 'File',
      properties: {
        'dc:title': 'bar',
      },
    };

    const repository = nuxeo.repository();
    return nuxeo.connect()
      .then(() => repository.create(WS_ROOT_PATH, ws))
      .then(() => repository.create(WS_JS_TESTS_PATH, file));
  });

  after(() => nuxeo.repository().delete(WS_JS_TESTS_PATH));

  describe('should upload a blob with an UTF-8 filename', () => {
    const nuxeoBlob = createTextBlob('foo', 'café.txt');

    it('with batch upload', () => {
      const batch = nuxeo.batchUpload();
      return batch.upload(nuxeoBlob)
        .then(() => batch.fetchBlob(0))
        .then(({ blob }) => {
          expect(blob.name).to.equal('café.txt');
          return nuxeo.operation('Blob.AttachOnDocument')
            .param('document', FILE_TEST_PATH)
            .input(blob)
            .execute();
        })
        .then(() => nuxeo.repository().fetch(FILE_TEST_PATH))
        .then((doc) => {
          expect(doc.get('file:content').name).to.equal('café.txt');
        });
    });

    it('with automation', () => (
      nuxeo.operation('Blob.AttachOnDocument')
        .param('document', FILE_TEST_PATH)
        .input(nuxeoBlob)
        .execute()
        .then(() => nuxeo.repository().fetch(FILE_TEST_PATH))
        .then((doc) => {
          expect(doc.get('file:content').name).to.equal('café.txt');
        })
    ));

    it('with FileManager.Import operation', () => {
      const nuxeoBinBlob = createTextBlob('foo', 'café.bin');
      return nuxeo.operation('FileManager.Import')
        .context({ currentDocument: WS_JS_TESTS_PATH })
        .input(nuxeoBinBlob)
        .execute()
        .then((doc) => {
          expect(doc.get('dc:title')).to.equal('café.bin');
        });
    });
  });

  describe('should retrieve a blob UTF-8 filename', () => {
    before(() => {
      const nuxeoBlob = createTextBlob('foo', 'café.txt');
      return nuxeo.operation('Blob.AttachOnDocument')
        .param('document', FILE_TEST_PATH)
        .input(nuxeoBlob)
        .execute();
    });

    it('with automation', function f() {
      if (nuxeo.serverVersion.lt(LTS_2016)) {
        this.skip();
      }

      return nuxeo.operation('Document.GetBlob')
        .input(FILE_TEST_PATH)
        .execute()
        .then((res) => {
          const disposition = contentDisposition.parse(res.headers.get('content-disposition'));
          expect(disposition.parameters.filename).to.be.equal('café.txt');
        });
    });

    it('in document properties', () => (
      nuxeo.repository().fetch(FILE_TEST_PATH)
        .then((doc) => {
          expect(doc.get('file:content').name).to.be.equal('café.txt');
        })
    ));

    it('with @blob adapter', function f() {
      if (nuxeo.serverVersion.lt(LTS_2016)) {
        this.skip();
      }

      return nuxeo.request(`path/${FILE_TEST_PATH}/@blob/file:content`)
        .get()
        .then((res) => {
          const disposition = contentDisposition.parse(res.headers.get('content-disposition'));
          expect(disposition.parameters.filename).to.be.equal('café.txt');
        });
    });
  });
});
