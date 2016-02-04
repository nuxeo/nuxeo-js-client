'use strict';

describe('Nuxeo', () => {
  let nuxeo;

  before(() => {
    nuxeo = new Nuxeo({
      schemas: ['dublincore', 'common'],
      headers: {
        foo: 'bar',
      },
    });
  });

  it('should have default values', () => {
    const n = new Nuxeo();
    expect(n._baseURL).to.be.equal('http://localhost:8080/nuxeo/');
    expect(n._restURL).to.be.equal('http://localhost:8080/nuxeo/api/v1/');
    expect(n._automationURL).to.be.equal('http://localhost:8080/nuxeo/api/v1/automation/');
    expect(n._auth.method).to.be.equal('basic');
    expect(n._auth.username).to.be.null();
    expect(n._auth.password).to.be.null();
  });

  it('should allow overriding default values when being created', () => {
    const n = new Nuxeo({
      baseURL: 'http://localhost:9000/nuxeo/',
      auth: {
        username: 'Administrator',
        password: 'Administrator',
      },
    });
    expect(n._baseURL).to.be.equal('http://localhost:9000/nuxeo/');
    expect(n._restURL).to.be.equal('http://localhost:9000/nuxeo/api/v1/');
    expect(n._automationURL).to.be.equal('http://localhost:9000/nuxeo/api/v1/automation/');
    expect(n._auth.method).to.be.equal('basic');
    expect(n._auth.username).to.be.equal('Administrator');
    expect(n._auth.password).to.be.equal('Administrator');
  });

  describe('#login', () => {
    it('should login and retrieve the logged in user', () => {
      nuxeo.login().then((user) => {
        expect(user['entity-type']).to.be.equal('user');
        expect(user.id).to.be.equal('Administrator');
        expect(user.properties.username).to.be.equal('Administrator');
        expect(user.properties.groups).to.be.equal(['administrators']);
      });
    });
  });

  describe('#operation', () => {
    it('should create an Operation object', () => {
      const op = nuxeo.operation('Document.Update');
      expect(op).to.be.an.instanceof(Nuxeo.Operation);
      expect(op).to.be.an.instanceof(Nuxeo.Base);
      expect(op._id).to.be.equal('Document.Update');
      expect(op._nuxeo).to.be.equal(nuxeo);
    });

    it('should inherit configuration from Nuxeo', () => {
      const op = nuxeo.operation('Document.Update');
      expect(op._schemas).to.be.eql(['dublincore', 'common']);
      expect(op._headers).to.be.eql({ foo: 'bar' });
      expect(op._url).to.be.equal('http://localhost:8080/nuxeo/api/v1/automation/');
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const op = nuxeo.operation('Document.Update', {
        schemas: ['file'],
        headers: {
          bar: 'foo',
        },
      });
      expect(op._schemas).to.be.eql(['file']);
      expect(op._headers).to.be.eql({
        foo: 'bar',
        bar: 'foo',
      });
    });
  });

  describe('#request', () => {
    it('should create a Request object', () => {
      const request = nuxeo.request('/path/default-domain');
      expect(request).to.be.an.instanceof(Nuxeo.Request);
      expect(request).to.be.an.instanceof(Nuxeo.Base);
      expect(request._path).to.be.equal('/path/default-domain');
      expect(request._nuxeo).to.be.equal(nuxeo);
    });

    it('should inherit configuration from Nuxeo', () => {
      const request = nuxeo.request('/path/default-domain');
      expect(request._schemas).to.be.eql(['dublincore', 'common']);
      expect(request._headers).to.be.eql({ foo: 'bar' });
      expect(request._url).to.be.equal('http://localhost:8080/nuxeo/api/v1/');
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const request = nuxeo.request('/path/default-domain', {
        schemas: ['file'],
        headers: {
          bar: 'foo',
        },
      });
      expect(request._schemas).to.be.eql(['file']);
      expect(request._headers).to.be.eql({
        foo: 'bar',
        bar: 'foo',
      });
    });
  });

  describe('#repository', () => {
    it('should create a Repository object', () => {
      const repository = nuxeo.repository();
      expect(repository).to.be.an.instanceof(Nuxeo.Repository);
      expect(repository).to.be.an.instanceof(Nuxeo.Base);
      expect(repository._repositoryName).to.be.equal('default');
      expect(repository._nuxeo).to.be.equal(nuxeo);

      const fooRepository = nuxeo.repository('foo');
      expect(fooRepository).to.be.an.instanceof(Nuxeo.Repository);
      expect(fooRepository).to.be.an.instanceof(Nuxeo.Base);
      expect(fooRepository._repositoryName).to.be.equal('foo');
      expect(repository._nuxeo).to.be.equal(nuxeo);
    });

    it('should inherit configuration from Nuxeo', () => {
      const repository = nuxeo.repository();
      expect(repository._schemas).to.be.eql(['dublincore', 'common']);
      expect(repository._headers).to.be.eql({ foo: 'bar' });
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const repository = nuxeo.repository('default', {
        schemas: ['file'],
        headers: {
          bar: 'foo',
        },
      });
      expect(repository._schemas).to.be.eql(['file']);
      expect(repository._headers).to.be.eql({
        foo: 'bar',
        bar: 'foo',
      });
    });
  });

  describe('#batchUpload', () => {
    it('should create a BatchUpload object', () => {
      const batch = nuxeo.batchUpload();
      expect(batch).to.be.an.instanceof(Nuxeo.BatchUpload);
      expect(batch).to.be.an.instanceof(Nuxeo.Base);
    });

    it('should inherit configuration from Nuxeo', () => {
      const batch = nuxeo.batchUpload();
      expect(batch._headers).to.be.eql({ foo: 'bar' });
      expect(batch._url).to.be.equal('http://localhost:8080/nuxeo/api/v1/upload/');
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const op = nuxeo.operation('Document.Update', {
        headers: {
          bar: 'foo',
        },
      });
      expect(op._headers).to.be.eql({
        foo: 'bar',
        bar: 'foo',
      });
    });
  });
});
