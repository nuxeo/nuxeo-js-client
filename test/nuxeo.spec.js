'use strict';

const pkg = require('../package.json');

describe('Nuxeo', () => {
  let nuxeo;

  before(() => {
    nuxeo = new Nuxeo({
      auth: {
        method: 'basic',
        username: 'Administrator',
        password: 'Administrator',
      },
      schemas: ['dublincore', 'common'],
      headers: {
        foo: 'bar',
      },
    });
  });

  it('should have a version', () => {
    expect(Nuxeo.version).to.be.equal(pkg.version);
  });

  it('should have default values', () => {
    const n = new Nuxeo();
    expect(n._baseURL).to.be.equal('http://localhost:8080/nuxeo/');
    expect(n._restURL).to.be.equal('http://localhost:8080/nuxeo/api/v1/');
    expect(n._automationURL).to.be.equal('http://localhost:8080/nuxeo/api/v1/automation/');
    expect(n._auth).to.be.null();
  });

  it('should allow overriding default values when being created', () => {
    const n = new Nuxeo({
      baseURL: 'http://localhost:9000/nuxeo/',
      auth: {
        method: 'basic',
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

  it('should have neither default \'transactionTimeout\' nor \'timeout\' set', () => {
    const n = new Nuxeo();
    expect(n._baseOptions.transactionTimeout).to.be.undefined();
    expect(n._baseOptions.timeout).to.be.undefined();
    expect(n._baseOptions.httpTimeout).to.be.equal(30000);
  });

  describe('#_computeTimeouts', () => {
    it('should use \'timeout\' for both \'httpTimeout\' and \'transactionTimeout\'', () => {
      const { httpTimeout, transactionTimeout } = nuxeo._computeTimeouts({ timeout: 25000 });
      expect(transactionTimeout).to.be.equal(25000);
      expect(httpTimeout).to.be.equal(25000 + 5);
    });

    it('should use \'httpTimeout\' if defined', () => {
      const { httpTimeout, transactionTimeout } = nuxeo._computeTimeouts({ timeout: 10000, httpTimeout: 20000 });
      expect(httpTimeout).to.be.equal(20000);
      expect(transactionTimeout).to.be.equal(10000);
    });

    it('should use \'transactionTimeout\' for both \'httpTimeout\' and \'transactionTimeout\' if defined', () => {
      const { httpTimeout, transactionTimeout } = nuxeo._computeTimeouts({ transactionTimeout: 10000 });
      expect(transactionTimeout).to.be.equal(10000);
      expect(httpTimeout).to.be.equal(10000 + 5);
    });

    it('should ignore \'timeout\'', () => {
      const { httpTimeout, transactionTimeout } = nuxeo._computeTimeouts({
        timeout: 10000, httpTimeout: 50000, transactionTimeout: 30000,
      });
      expect(transactionTimeout).to.be.equal(30000);
      expect(httpTimeout).to.be.equal(50000);
    });
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
      expect(op._baseOptions.schemas).to.be.eql(['dublincore', 'common']);
      expect(op._baseOptions.headers).to.be.eql({ foo: 'bar' });
      expect(op._url).to.be.equal('http://localhost:8080/nuxeo/api/v1/automation/');
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const op = nuxeo.operation('Document.Update', {
        schemas: ['file'],
        headers: {
          bar: 'foo',
        },
      });
      expect(op._baseOptions.schemas).to.be.eql(['file']);
      expect(op._baseOptions.headers).to.be.eql({
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
      expect(request._baseOptions.schemas).to.be.eql(['dublincore', 'common']);
      expect(request._baseOptions.headers).to.be.eql({ foo: 'bar' });
      expect(request._url).to.be.equal('http://localhost:8080/nuxeo/api/v1/');
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const request = nuxeo.request('/path/default-domain', {
        schemas: ['file'],
        headers: {
          bar: 'foo',
        },
      });
      expect(request._baseOptions.schemas).to.be.eql(['file']);
      expect(request._baseOptions.headers).to.be.eql({
        bar: 'foo',
      });
    });
  });

  describe('#repository', () => {
    it('should create a Repository object', () => {
      const repository = nuxeo.repository();
      expect(repository).to.be.an.instanceof(Nuxeo.Repository);
      expect(repository).to.be.an.instanceof(Nuxeo.Base);
      expect(repository._baseOptions.repositoryName).to.be.equal('default');
      expect(repository._nuxeo).to.be.equal(nuxeo);

      const fooRepository = nuxeo.repository('foo');
      expect(fooRepository).to.be.an.instanceof(Nuxeo.Repository);
      expect(fooRepository).to.be.an.instanceof(Nuxeo.Base);
      expect(fooRepository._baseOptions.repositoryName).to.be.equal('foo');
      expect(fooRepository._nuxeo).to.be.equal(nuxeo);
    });

    it('should inherit configuration from Nuxeo', () => {
      const repository = nuxeo.repository();
      expect(repository._baseOptions.schemas).to.be.eql(['dublincore', 'common']);
      expect(repository._baseOptions.headers).to.be.eql({ foo: 'bar' });
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const repository = nuxeo.repository('default', {
        schemas: ['file'],
        headers: {
          bar: 'foo',
        },
      });
      expect(repository._baseOptions.schemas).to.be.eql(['file']);
      expect(repository._baseOptions.headers).to.be.eql({
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
      expect(batch._baseOptions.headers).to.be.eql({ foo: 'bar' });
      expect(batch._url).to.be.equal('http://localhost:8080/nuxeo/api/v1/upload/');
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const op = nuxeo.operation('Document.Update', {
        headers: {
          bar: 'foo',
        },
      });
      expect(op._baseOptions.headers).to.be.eql({
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
      expect(users._baseOptions.headers).to.be.eql({ foo: 'bar' });
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const users = nuxeo.users({
        headers: {
          bar: 'foo',
        },
      });
      expect(users._baseOptions.headers).to.be.eql({
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
      expect(groups._baseOptions.headers).to.be.eql({ foo: 'bar' });
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const groups = nuxeo.groups({
        headers: {
          bar: 'foo',
        },
      });
      expect(groups._baseOptions.headers).to.be.eql({
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
      expect(directory._baseOptions.headers).to.be.eql({ foo: 'bar' });
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const directory = nuxeo.directory('foo', {
        headers: {
          bar: 'foo',
        },
      });
      expect(directory._baseOptions.headers).to.be.eql({
        bar: 'foo',
      });
    });
  });

  describe('#workflows', () => {
    it('should create a Workflows object', () => {
      const workflows = nuxeo.workflows();
      expect(workflows).to.be.an.instanceof(Nuxeo.Workflows);
      expect(workflows).to.be.an.instanceof(Nuxeo.Base);
      expect(workflows._baseOptions.repositoryName).to.be.equal('default');
      expect(workflows._nuxeo).to.be.equal(nuxeo);

      const fooWorkflows = nuxeo.workflows('foo');
      expect(fooWorkflows).to.be.an.instanceof(Nuxeo.Workflows);
      expect(fooWorkflows).to.be.an.instanceof(Nuxeo.Base);
      expect(fooWorkflows._baseOptions.repositoryName).to.be.equal('foo');
      expect(fooWorkflows._nuxeo).to.be.equal(nuxeo);
    });

    it('should inherit configuration from Nuxeo', () => {
      const workflows = nuxeo.workflows();
      expect(workflows._baseOptions.headers).to.be.eql({ foo: 'bar' });
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const workflows = nuxeo.workflows('foo', {
        headers: {
          bar: 'foo',
        },
      });
      expect(workflows._baseOptions.headers).to.be.eql({
        bar: 'foo',
      });
    });
  });

  describe('#_computeFetchOptions', () => {
    it('should compute needed headers', () => {
      const repo = nuxeo.repository();
      repo.enrichers({
        document: ['acls', 'permissions'],
        user: ['groups'],
      });
      repo.enricher('group', 'members');
      repo.fetchProperty('document', 'dc:creator');
      repo.fetchProperty('document', 'dc:subject');
      repo.depth('children');
      const options = nuxeo._computeFetchOptions(repo._computeOptions());
      expect(options.headers).to.exist();
      expect(options.headers['enrichers-document']).to.be.equal('acls,permissions');
      expect(options.headers['enrichers-user']).to.be.equal('groups');
      expect(options.headers['enrichers-group']).to.be.equal('members');
      expect(options.headers['fetch-document']).to.be.equal('dc:creator,dc:subject');
      expect(options.headers.depth).to.be.equal('children');
    });

    it('should keep query parameters ordered', () => {
      const defaultOptions = {
        url: 'http://localhost:8080/nuxeo',
        queryParams: {
          param: [1, 2, 3],
        },
      };
      const options = nuxeo._computeFetchOptions(defaultOptions);
      expect(options.url).to.be.equal('http://localhost:8080/nuxeo?param=1&param=2&param=3');
    });
  });
});
