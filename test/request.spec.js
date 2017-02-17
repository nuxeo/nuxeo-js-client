const join = require('../lib/deps/utils/join');

const WS_ROOT_PATH = '/default-domain/workspaces';
const WS_JS_TEST_NAME = 'ws-js-tests';
const WS_JS_TESTS_PATH = join(WS_ROOT_PATH, WS_JS_TEST_NAME);

describe('Request', () => {
  let nuxeo;

  before(() => {
    nuxeo = new Nuxeo({ auth: { method: 'basic', username: 'Administrator', password: 'Administrator' } });

    const newDoc = {
      name: WS_JS_TEST_NAME,
      type: 'Workspace',
      properties: {
        'dc:title': 'foo',
      },
    };
    return nuxeo.repository().create(WS_ROOT_PATH, newDoc);
  });

  it('should allow configuring request path', () => {
    const req = nuxeo.request('dummy');
    expect(req._path).to.be.equal('dummy');
    req.path('document').path('path');
    expect(req._path).to.be.equal('dummy/document/path');
  });

  it('should allow configuring query parameters', () => {
    const req = nuxeo.request('dummy', {
      queryParams: {
        bar: 'foo',
      },
    });
    expect(req._queryParams).to.be.eql({
      bar: 'foo',
    });
    req.queryParams({
      foo: 'bar',
    });
    expect(req._queryParams).to.be.eql({
      bar: 'foo',
      foo: 'bar',
    });
    req.queryParams({
      bar: 'bar',
    });
    expect(req._queryParams).to.be.eql({
      bar: 'bar',
      foo: 'bar',
    });
  });

  it('should compute an URL with query params', () => (
    nuxeo.request(join('path', WS_JS_TESTS_PATH))
      .queryParams({
        foo: 'foo',
        bar: 'bar',
      })
      .get({
        resolveWithFullResponse: true,
      })
      .then((res) => {
        if (res.url.length > 0) {
          // url is empty on FF
          expect(res.url).to.be.equal('http://localhost:8080/nuxeo/api/v1/repo/default/path/default-domain/workspaces/ws-js-tests?foo=foo&bar=bar');
        }
      })
  ));

  it('should do a GET request', () => (
    nuxeo.request(join('path', WS_JS_TESTS_PATH))
      .get().then((res) => {
        expect(res.uid).to.exist();
        expect(res.path).to.be.equal(WS_JS_TESTS_PATH);
        expect(res.type).to.be.equal('Workspace');
      })
  ));

  it('should do a POST request', () => {
    const newDoc = {
      'entity-type': 'document',
      name: 'foo',
      type: 'File',
      properties: {
        'dc:title': 'foo',
      },
    };
    return nuxeo.request(join('path', WS_JS_TESTS_PATH))
      .post({
        body: newDoc,
      })
      .then((res) => {
        expect(res.uid).to.exist();
        expect(res.path).to.be.equal(join(WS_JS_TESTS_PATH, 'foo'));
        expect(res.type).to.be.equal('File');
      });
  });

  it('should do a PUT request', () => {
    const newDoc = {
      'entity-type': 'document',
      properties: {
        'dc:description': 'bar',
      },
    };
    return nuxeo.request(join('path', WS_JS_TESTS_PATH))
      .put({
        body: newDoc,
        schemas: ['dublincore'],
      })
      .then((res) => {
        expect(res.uid).to.exist();
        expect(res.path).to.be.equal(WS_JS_TESTS_PATH);
        expect(res.type).to.be.equal('Workspace');
        expect(res.properties['dc:description']).to.be.equal('bar');
      });
  });

  it('should do a DELETE request', () => (
    nuxeo.request(join('path', WS_JS_TESTS_PATH))
      .delete().then((res) => {
        expect(res.status).to.be.equal(204);
      })
  ));
});
