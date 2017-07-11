const Authentication = require('../lib/auth/auth');
const { btoa } = require('../lib/deps/utils/base64');

describe('Authenticators', () => {
  describe('Basic', () => {
    const auth = {
      method: 'basic',
      username: 'test',
      password: '1234',
    };
    const authenticator = Authentication.basicAuthenticator;

    it('should compute authentication headers', () => {
      const base64 = btoa('test:1234');
      const authorizationHeader = `Basic ${base64}`;

      const nuxeo = new Nuxeo({ auth });
      const headersToCheck = [
        authenticator.computeAuthenticationHeaders(auth),
        nuxeo.computeAuthenticationHeaders(),
      ];

      headersToCheck.forEach((headers) => {
        expect(headers).to.have.property('Authorization', authorizationHeader);
      });
    });

    it('should authenticate an URL', () => {
      const url = 'http://localhost:8080/nuxeo/api/v1/path/';
      const nuxeo = new Nuxeo({ auth });

      const authenticatedURLsToCheck = [
        authenticator.authenticateURL(url, auth),
        nuxeo.authenticateURL(url),
      ];

      authenticatedURLsToCheck.forEach((authenticatedURL) => {
        expect(authenticatedURL).to.be.equal('http://test:1234@localhost:8080/nuxeo/api/v1/path/');
      });
    });
  });

  describe('Token', () => {
    const auth = {
      method: 'token',
      token: 'secret_token',
    };
    const nuxeo = new Nuxeo({ auth });
    const authenticator = Authentication.tokenAuthenticator;

    it('should compute authentication headers', () => {
      const headersToCheck = [
        authenticator.computeAuthenticationHeaders(auth),
        nuxeo.computeAuthenticationHeaders(),
      ];

      headersToCheck.forEach((headers) => {
        expect(headers).to.have.property('X-Authentication-Token', 'secret_token');
      });
    });

    it('should authenticate an URL', () => {
      const url = 'http://localhost:8080/nuxeo/api/v1/path/';

      const authenticatedURLsToCheck = [
        authenticator.authenticateURL(url, auth),
        nuxeo.authenticateURL(url),
      ];

      authenticatedURLsToCheck.forEach((authenticatedURL) => {
        expect(authenticatedURL).to.be.equal('http://localhost:8080/nuxeo/api/v1/path/?token=secret_token');
      });
    });
  });

  describe('Bearer', () => {
    const auth = {
      method: 'bearerToken',
      token: 'secret_token',
    };
    const auth2 = {
      method: 'bearerToken',
      token: { access_token: 'secret_token', refresh_token: 'refresh' },
    };
    const authenticator = Authentication.bearerTokenAuthenticator;
    const nuxeo = new Nuxeo({ auth });
    const nuxeo2 = new Nuxeo({ auth: auth2 });

    it('should compute authentication headers', () => {
      const headersToCheck = [
        authenticator.computeAuthenticationHeaders(auth),
        nuxeo.computeAuthenticationHeaders(),
        nuxeo2.computeAuthenticationHeaders(),
      ];

      headersToCheck.forEach((headers) => {
        expect(headers).to.have.property('Authorization', 'Bearer secret_token');
      });
    });

    it('should authenticate an URL', () => {
      const url = 'http://localhost:8080/nuxeo/api/v1/path/';

      const authenticatedURLsToCheck = [
        authenticator.authenticateURL(url, auth),
        nuxeo.authenticateURL(url),
        nuxeo2.authenticateURL(url),
      ];

      authenticatedURLsToCheck.forEach((authenticatedURL) => {
        expect(authenticatedURL).to.be.equal('http://localhost:8080/nuxeo/api/v1/path/?access_token=secret_token');
      });
    });
  });

  describe('Portal', () => {
    const auth = {
      method: 'portal',
      secret: 'secret',
      username: 'test',
    };
    const nuxeo = new Nuxeo({ auth });
    const authenticator = Authentication.portalAuthenticator;

    it('should compute authentication headers', () => {
      const headersToCheck = [
        authenticator.computeAuthenticationHeaders(auth),
        nuxeo.computeAuthenticationHeaders(),
      ];

      headersToCheck.forEach((headers) => {
        expect(headers).to.have.all.keys('NX_RD', 'NX_TS', 'NX_TOKEN', 'NX_USER');
      });
    });

    it('should not authenticate an URL', () => {
      expect(authenticator).to.not.have.property('authenticateURL');

      const url = 'http://localhost:8080/nuxeo/api/v1/path/';
      const authenticatedURL = nuxeo.authenticateURL(url);
      expect(authenticatedURL).to.be.equal(url);
    });
  });
});
