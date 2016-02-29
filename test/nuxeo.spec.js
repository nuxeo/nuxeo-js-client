'use strict';

describe('Nuxeo', () => {
  let nuxeo;

  before(() => {
    nuxeo = new Nuxeo({
      auth: {
        username: 'Administrator',
        password: 'Administrator',
      },
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
      return nuxeo.login().then((user) => {
        expect(user['entity-type']).to.be.equal('user');
        expect(user.id).to.be.equal('Administrator');
        expect(user.properties.username).to.be.equal('Administrator');
        expect(user.properties.groups).to.be.eql(['administrators']);
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
      expect(fooRepository._nuxeo).to.be.equal(nuxeo);
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

  describe('#users', () => {
    it('should create a Users object', () => {
      const users = nuxeo.users();
      expect(users).to.be.an.instanceof(Nuxeo.Users);
      expect(users).to.be.an.instanceof(Nuxeo.Base);
      expect(users._nuxeo).to.be.equal(nuxeo);
    });

    it('should inherit configuration from Nuxeo', () => {
      const users = nuxeo.users();
      expect(users._headers).to.be.eql({ foo: 'bar' });
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const users = nuxeo.users({
        headers: {
          bar: 'foo',
        },
      });
      expect(users._headers).to.be.eql({
        foo: 'bar',
        bar: 'foo',
      });
    });
  });

  describe('#groups', () => {
    it('should create a Groups object', () => {
      const groups = nuxeo.groups();
      expect(groups).to.be.an.instanceof(Nuxeo.Groups);
      expect(groups).to.be.an.instanceof(Nuxeo.Base);
      expect(groups._nuxeo).to.be.equal(nuxeo);
    });

    it('should inherit configuration from Nuxeo', () => {
      const groups = nuxeo.groups();
      expect(groups._headers).to.be.eql({ foo: 'bar' });
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const groups = nuxeo.groups({
        headers: {
          bar: 'foo',
        },
      });
      expect(groups._headers).to.be.eql({
        foo: 'bar',
        bar: 'foo',
      });
    });
  });

  describe('#directory', () => {
    it('should create a Directory object', () => {
      const directory = nuxeo.directory('foo');
      expect(directory).to.be.an.instanceof(Nuxeo.Directory);
      expect(directory).to.be.an.instanceof(Nuxeo.Base);
      expect(directory._directoryName).to.be.equal('foo');
      expect(directory._nuxeo).to.be.equal(nuxeo);
    });

    it('should inherit configuration from Nuxeo', () => {
      const directory = nuxeo.directory();
      expect(directory._headers).to.be.eql({ foo: 'bar' });
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const directory = nuxeo.directory('foo', {
        headers: {
          bar: 'foo',
        },
      });
      expect(directory._headers).to.be.eql({
        foo: 'bar',
        bar: 'foo',
      });
    });
  });

  describe('#workflows', () => {
    it('should create a Workflows object', () => {
      const workflows = nuxeo.workflows();
      expect(workflows).to.be.an.instanceof(Nuxeo.Workflows);
      expect(workflows).to.be.an.instanceof(Nuxeo.Base);
      expect(workflows._repositoryName).to.be.equal('default');
      expect(workflows._nuxeo).to.be.equal(nuxeo);

      const fooWorkflows = nuxeo.workflows('foo');
      expect(fooWorkflows).to.be.an.instanceof(Nuxeo.Workflows);
      expect(fooWorkflows).to.be.an.instanceof(Nuxeo.Base);
      expect(fooWorkflows._repositoryName).to.be.equal('foo');
      expect(fooWorkflows._nuxeo).to.be.equal(nuxeo);
    });

    it('should inherit configuration from Nuxeo', () => {
      const workflows = nuxeo.workflows();
      expect(workflows._headers).to.be.eql({ foo: 'bar' });
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const workflows = nuxeo.workflows('foo', {
        headers: {
          bar: 'foo',
        },
      });
      expect(workflows._headers).to.be.eql({
        foo: 'bar',
        bar: 'foo',
      });
    });
  });
});
