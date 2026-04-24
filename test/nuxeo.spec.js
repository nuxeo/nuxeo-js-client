const pkg = require('../package.json');
const { LTS_2017 } = require('../lib/server-version');

describe('Nuxeo', () => {
  let nuxeo;

  beforeAll(() => {
    nuxeo = new Nuxeo({
      baseURL,
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
    expect(Nuxeo.version).toBe(pkg.version);
  });

  it('should have default values', () => {
    const n = new Nuxeo();
    expect(n._baseURL).toBe('http://localhost:8080/nuxeo/');
    expect(n._restURL).toBe('http://localhost:8080/nuxeo/api/v1/');
    expect(n._automationURL).toBe('http://localhost:8080/nuxeo/api/v1/automation/');
    expect(n._auth).toBeNull();
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
    expect(n._baseURL).toBe('http://localhost:9000/nuxeo/');
    expect(n._restURL).toBe('http://localhost:9000/nuxeo/api/v1/');
    expect(n._automationURL).toBe('http://localhost:9000/nuxeo/api/v1/automation/');
    expect(n._auth.method).toBe('basic');
    expect(n._auth.username).toBe('Administrator');
    expect(n._auth.password).toBe('Administrator');
  });

  it('should have neither default \'transactionTimeout\' nor \'timeout\' set', () => {
    const n = new Nuxeo();
    expect(n._baseOptions.transactionTimeout).toBeUndefined();
    expect(n._baseOptions.timeout).toBeUndefined();
    expect(n._baseOptions.httpTimeout).toBe(30000);
  });

  describe('#_computeTimeouts', () => {
    it('should use \'timeout\' for both \'httpTimeout\' and \'transactionTimeout\'', () => {
      const { httpTimeout, transactionTimeout } = nuxeo._computeTimeouts({ timeout: 25000 });
      expect(transactionTimeout).toBe(25000);
      expect(httpTimeout).toBe(25000 + 5);
    });

    it('should use \'httpTimeout\' if defined', () => {
      const { httpTimeout, transactionTimeout } = nuxeo._computeTimeouts({ timeout: 10000, httpTimeout: 20000 });
      expect(httpTimeout).toBe(20000);
      expect(transactionTimeout).toBe(10000);
    });

    it('should use \'transactionTimeout\' for both \'httpTimeout\' and \'transactionTimeout\' if defined', () => {
      const { httpTimeout, transactionTimeout } = nuxeo._computeTimeouts({ transactionTimeout: 10000 });
      expect(transactionTimeout).toBe(10000);
      expect(httpTimeout).toBe(10000 + 5);
    });

    it('should ignore \'timeout\'', () => {
      const { httpTimeout, transactionTimeout } = nuxeo._computeTimeouts({
        timeout: 10000, httpTimeout: 50000, transactionTimeout: 30000,
      });
      expect(transactionTimeout).toBe(30000);
      expect(httpTimeout).toBe(50000);
    });
  });

  describe('#connect', () => {
    it('should connect to a Nuxeo Server', () => (
      nuxeo.connect().then((n) => {
        expect(n.connected).toBe(true);
        expect(nuxeo.connected).toBe(true);

        const { user } = n;
        expect(user['entity-type']).toBe('user');
        expect(user.id).toBeDefined();
        expect(user.properties.username).toBe('Administrator');
        expect(user.properties.groups).toEqual(['administrators']);

        const profile = n.user.contextParameters.userprofile;
        expect(profile).not.toBeNull();
        const expectedKeys = ['birthdate', 'phonenumber', 'avatar'];
        if (nuxeo.serverVersion.gt(LTS_2017)) {
          expectedKeys.push('gender', 'locale');
        }
        expect(Object.keys(profile).sort()).toEqual(expectedKeys.sort());

        expect(n.nuxeoVersion).not.toBeNull();
        expect(n.serverVersion).not.toBeNull();
      })
    ));
  });

  describe('#operation', () => {
    it('should create an Operation object', () => {
      const op = nuxeo.operation('Document.Update');
      expect(op).toBeInstanceOf(Nuxeo.Operation);
      expect(op).toBeInstanceOf(Nuxeo.Base);
      expect(op._id).toBe('Document.Update');
      expect(op._nuxeo).toBe(nuxeo);
    });

    it('should inherit configuration from Nuxeo', () => {
      const op = nuxeo.operation('Document.Update');
      expect(op._baseOptions.schemas).toEqual(['dublincore', 'common']);
      expect(op._baseOptions.headers).toEqual({ foo: 'bar' });
      expect(op._url).toBe(`${baseURL}/api/v1/automation/`);
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const op = nuxeo.operation('Document.Update', {
        schemas: ['file'],
        headers: {
          bar: 'foo',
        },
      });
      expect(op._baseOptions.schemas).toEqual(['file']);
      expect(op._baseOptions.headers).toEqual({
        bar: 'foo',
      });
    });
  });

  describe('#request', () => {
    it('should create a Request object', () => {
      const request = nuxeo.request('/path/default-domain');
      expect(request).toBeInstanceOf(Nuxeo.Request);
      expect(request).toBeInstanceOf(Nuxeo.Base);
      expect(request._path).toBe('/path/default-domain');
      expect(request._nuxeo).toBe(nuxeo);
    });

    it('should inherit configuration from Nuxeo', () => {
      const request = nuxeo.request('/path/default-domain');
      expect(request._baseOptions.schemas).toEqual(['dublincore', 'common']);
      expect(request._baseOptions.headers).toEqual({ foo: 'bar' });
      expect(request._url).toBe(`${baseURL}/api/v1/`);
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const request = nuxeo.request('/path/default-domain', {
        schemas: ['file'],
        headers: {
          bar: 'foo',
        },
      });
      expect(request._baseOptions.schemas).toEqual(['file']);
      expect(request._baseOptions.headers).toEqual({
        bar: 'foo',
      });
    });
  });

  describe('#repository', () => {
    it('should create a Repository object', () => {
      const repository = nuxeo.repository();
      expect(repository).toBeInstanceOf(Nuxeo.Repository);
      expect(repository).toBeInstanceOf(Nuxeo.Base);
      expect(repository._baseOptions.repositoryName).toBeUndefined();
      expect(repository._nuxeo).toBe(nuxeo);

      const fooRepository = nuxeo.repository('foo');
      expect(fooRepository).toBeInstanceOf(Nuxeo.Repository);
      expect(fooRepository).toBeInstanceOf(Nuxeo.Base);
      expect(fooRepository._baseOptions.repositoryName).toBe('foo');
      expect(fooRepository._nuxeo).toBe(nuxeo);
    });

    it('should inherit configuration from Nuxeo', () => {
      const repository = nuxeo.repository();
      expect(repository._baseOptions.schemas).toEqual(['dublincore', 'common']);
      expect(repository._baseOptions.headers).toEqual({ foo: 'bar' });
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const repository = nuxeo.repository('default', {
        schemas: ['file'],
        headers: {
          bar: 'foo',
        },
      });
      expect(repository._baseOptions.schemas).toEqual(['file']);
      expect(repository._baseOptions.headers).toEqual({
        bar: 'foo',
      });
    });
  });

  describe('#batchUpload', () => {
    it('should create a BatchUpload object', () => {
      const batch = nuxeo.batchUpload();
      expect(batch).toBeInstanceOf(Nuxeo.BatchUpload);
      expect(batch).toBeInstanceOf(Nuxeo.Base);
    });

    it('should inherit configuration from Nuxeo', () => {
      const batch = nuxeo.batchUpload();
      expect(batch._baseOptions.headers).toEqual({ foo: 'bar' });
      expect(batch._url).toBe(`${baseURL}/api/v1/upload/`);
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const op = nuxeo.operation('Document.Update', {
        headers: {
          bar: 'foo',
        },
      });
      expect(op._baseOptions.headers).toEqual({
        bar: 'foo',
      });
    });
  });

  describe('#users', () => {
    it('should create a Users object', () => {
      const users = nuxeo.users();
      expect(users).toBeInstanceOf(Nuxeo.Users);
      expect(users).toBeInstanceOf(Nuxeo.Base);
      expect(users._nuxeo).toBe(nuxeo);
    });

    it('should inherit configuration from Nuxeo', () => {
      const users = nuxeo.users();
      expect(users._baseOptions.headers).toEqual({ foo: 'bar' });
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const users = nuxeo.users({
        headers: {
          bar: 'foo',
        },
      });
      expect(users._baseOptions.headers).toEqual({
        bar: 'foo',
      });
    });
  });

  describe('#groups', () => {
    it('should create a Groups object', () => {
      const groups = nuxeo.groups();
      expect(groups).toBeInstanceOf(Nuxeo.Groups);
      expect(groups).toBeInstanceOf(Nuxeo.Base);
      expect(groups._nuxeo).toBe(nuxeo);
    });

    it('should inherit configuration from Nuxeo', () => {
      const groups = nuxeo.groups();
      expect(groups._baseOptions.headers).toEqual({ foo: 'bar' });
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const groups = nuxeo.groups({
        headers: {
          bar: 'foo',
        },
      });
      expect(groups._baseOptions.headers).toEqual({
        bar: 'foo',
      });
    });
  });

  describe('#directory', () => {
    it('should create a Directory object', () => {
      const directory = nuxeo.directory('foo');
      expect(directory).toBeInstanceOf(Nuxeo.Directory);
      expect(directory).toBeInstanceOf(Nuxeo.Base);
      expect(directory._directoryName).toBe('foo');
      expect(directory._nuxeo).toBe(nuxeo);
    });

    it('should inherit configuration from Nuxeo', () => {
      const directory = nuxeo.directory();
      expect(directory._baseOptions.headers).toEqual({ foo: 'bar' });
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const directory = nuxeo.directory('foo', {
        headers: {
          bar: 'foo',
        },
      });
      expect(directory._baseOptions.headers).toEqual({
        bar: 'foo',
      });
    });
  });

  describe('#workflows', () => {
    it('should create a Workflows object', () => {
      const workflows = nuxeo.workflows();
      expect(workflows).toBeInstanceOf(Nuxeo.Workflows);
      expect(workflows).toBeInstanceOf(Nuxeo.Base);
      expect(workflows._baseOptions.repositoryName).toBeUndefined();
      expect(workflows._nuxeo).toBe(nuxeo);

      const fooWorkflows = nuxeo.workflows('foo');
      expect(fooWorkflows).toBeInstanceOf(Nuxeo.Workflows);
      expect(fooWorkflows).toBeInstanceOf(Nuxeo.Base);
      expect(fooWorkflows._baseOptions.repositoryName).toBe('foo');
      expect(fooWorkflows._nuxeo).toBe(nuxeo);
    });

    it('should inherit configuration from Nuxeo', () => {
      const workflows = nuxeo.workflows();
      expect(workflows._baseOptions.headers).toEqual({ foo: 'bar' });
    });

    it('should allow overriding configuration from Nuxeo', () => {
      const workflows = nuxeo.workflows('foo', {
        headers: {
          bar: 'foo',
        },
      });
      expect(workflows._baseOptions.headers).toEqual({
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
      repo.fetchProperties({ document: ['dc:creator', 'dc:subject'] });
      repo.depth('children');
      const options = nuxeo._computeFetchOptions(repo._computeOptions());
      expect(options.headers).toBeDefined();
      expect(options.headers['Nuxeo-Transaction-Timeout']).toBeUndefined();
      expect(options.headers['enrichers-document']).toBe('acls,permissions');
      expect(options.headers['enrichers-user']).toBe('groups');
      expect(options.headers['enrichers-group']).toBe('members');
      expect(options.headers['fetch-document']).toBe('dc:creator,dc:subject');
      expect(options.headers.depth).toBe('children');
    });

    it('should keep query parameters ordered', () => {
      const defaultOptions = {
        url: 'http://localhost:8080/nuxeo',
        queryParams: {
          param: [1, 2, 3],
        },
      };
      const options = nuxeo._computeFetchOptions(defaultOptions);
      expect(options.url).toBe('http://localhost:8080/nuxeo?param=1&param=2&param=3');
    });

    it('should keep the abort signal property if it is provided', () => {
      const defaultOptions = {
        url: 'http://localhost:8080/nuxeo',
        signal: {
          message: 'Abort this request',
        },
      };
      const options = nuxeo._computeFetchOptions(defaultOptions);
      expect(options.url).toBe('http://localhost:8080/nuxeo');
      expect(options.signal).toBeDefined();
      expect(options.signal).toEqual(defaultOptions.signal);
    });

    it('should not add the abort signal property if it is not provided', () => {
      const defaultOptions = {
        url: 'http://localhost:8080/nuxeo',
      };
      const options = nuxeo._computeFetchOptions(defaultOptions);
      expect(options.url).toBe('http://localhost:8080/nuxeo');
      expect(options.signal).toBeUndefined();
    });
  });
});
