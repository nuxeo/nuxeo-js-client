const qs = require('querystring');
const jwt = require('jsonwebtoken');

const fetch = require('../lib/deps/fetch');
const { btoa } = require('../lib/deps/utils/base64');

const OAUTH2_CLIENTS_DIRECTORY_NAME = 'oauth2Clients';
const OAUTH2_TOKENS_DIRECTORY_NAME = 'oauth2Tokens';
const JWT_SHARED_SECRET = 'abracadabra';

const CLIENT_ID = 'test-client';

describe('OAuth2 spec', () => {
  let nuxeo;
  let oauth2Client;

  before(() => {
    nuxeo = new Nuxeo({
      baseURL,
      auth: {
        method: 'basic',
        username: 'Administrator',
        password: 'Administrator',
      },
    });

    // create a OAuth2 client for the tests
    return nuxeo.connect()
      .then(() => (
        nuxeo.directory(OAUTH2_CLIENTS_DIRECTORY_NAME).create({
          properties: {
            name: 'Test Client',
            clientId: CLIENT_ID,
            redirectURIs: `${baseURL}/home.html`,
          },
        })
      ))
      .then((entry) => { oauth2Client = entry; });
  });

  after(() => {
    const oauth2TokensDir = nuxeo.directory(OAUTH2_TOKENS_DIRECTORY_NAME);
    return nuxeo.directory(OAUTH2_CLIENTS_DIRECTORY_NAME).delete(oauth2Client.properties.id)
      .then(() => oauth2TokensDir.fetchAll())
      .then(({ entries }) => Promise.all(entries.map((entry) => oauth2TokensDir.delete(entry.properties.id))));
  });

  describe('Authorization URL', () => {
    before(function f() {
      if (nuxeo.serverVersion.lt('9.2')) {
        this.skip();
      }
    });

    it('should compute an authorization URL without params', () => {
      const url = Nuxeo.oauth2.getAuthorizationURL('http://localhost:8080/nuxeo', CLIENT_ID);
      expect(url.startsWith('http://localhost:8080/nuxeo/oauth2/authorize?')).to.be.true();
      expect(url).to.include('client_id=test-client');
      expect(url).to.include('response_type=code');
    });

    it('should compute an authorization URL with additional params', () => {
      const url = Nuxeo.oauth2.getAuthorizationURL('http://localhost:8080/nuxeo/', CLIENT_ID, {
        redirect_uri: 'http://localhost:8000/authorize',
        state: 'xyz',
        response_type: 'token',
      });
      expect(url.startsWith('http://localhost:8080/nuxeo/oauth2/authorize?')).to.be.true();
      expect(url).to.include('client_id=test-client');
      expect(url).to.include('state=xyz');
      expect(url).to.include('redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fauthorize');
      expect(url).to.include('response_type=token');
    });

    it('should throw an error if missing arguments', () => {
      expect(() => { Nuxeo.oauth2.getAuthorizationURL('http://localhost:8080/nuxeo'); })
        .to.throw(Error, 'Missing `clientId` argument');
      expect(() => { Nuxeo.oauth2.getAuthorizationURL(null, CLIENT_ID); })
        .to.throw(Error, 'Missing `baseURL` argument');
    });
  });

  function fetchAccessToken() {
    const url = Nuxeo.oauth2.getAuthorizationURL(baseURL, CLIENT_ID);
    const formParameters = qs.parse(url.substring(url.indexOf('?') + 1));
    formParameters.grant_access = '1';
    const submitURL = url.replace(/authorize.*/, 'authorize_submit');
    const base64 = btoa('Administrator:Administrator');
    const authorization = `Basic ${base64}`;
    return fetch(submitURL, {
      method: 'POST',
      body: qs.stringify(formParameters),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: authorization,
      },
    }).then((res) => {
      const queryParameters = res.url.substring(res.url.indexOf('?') + 1);
      const parameters = qs.parse(queryParameters);
      return Nuxeo.oauth2.fetchAccessTokenFromAuthorizationCode(baseURL, CLIENT_ID, parameters.code);
    });
  }

  describe('Access Token', () => {
    before(function f() {
      if (nuxeo.serverVersion.lt('9.2') || isBrowser) {
        this.skip();
      }
    });

    it('should fetch an access token from an authorization code', () => (
      fetchAccessToken()
        .then((token) => {
          expect(token).to.have.all.keys('access_token', 'refresh_token', 'token_type', 'expires_in');
        })
    ));

    it('should authenticate using bearer token authentication method', () => (
      fetchAccessToken()
        .then((token) => {
          const bearerNuxeo = new Nuxeo({
            baseURL,
            auth: { CLIENT_ID, method: 'bearerToken', token: token.access_token },
          });
          return bearerNuxeo.repository().fetch('/')
            .then((doc) => {
              expect(doc).to.be.an.instanceof(Nuxeo.Document);
              expect(doc.uid).to.exist();
            });
        })
    ));

    it('should refresh manually an access token', () => {
      let firstToken;
      return fetchAccessToken()
        .then((token) => {
          firstToken = token;
          const bearerNuxeo = new Nuxeo({ baseURL, auth: { clientId: CLIENT_ID, method: 'bearerToken', token } });
          return bearerNuxeo.repository().fetch('/');
        })
        .then((doc) => {
          expect(doc).to.be.an.instanceof(Nuxeo.Document);
          expect(doc.uid).to.exist();
          return Nuxeo.oauth2.refreshAccessToken(baseURL, CLIENT_ID, firstToken.refresh_token);
        })
        .then((token) => {
          const bearerNuxeo = new Nuxeo({
            baseURL,
            auth: { clientId: CLIENT_ID, method: 'bearerToken', token: token.access_token },
          });
          return bearerNuxeo.repository().fetch('/');
        })
        .then((doc) => {
          expect(doc).to.be.an.instanceof(Nuxeo.Document);
          expect(doc.uid).to.exist();
          const bearerNuxeo = new Nuxeo({
            baseURL,
            auth: { clientId: CLIENT_ID, method: 'bearerToken', token: firstToken },
          });
          return bearerNuxeo.repository().fetch('/default-domain')
            .catch((error) => {
              expect(error.response.url).to.be.equal(`${baseURL}/api/v1/path/default-domain`);
              expect(error.response.status).to.be.equal(401);
            });
        });
    });

    it('should refresh automatically an access token', function f() {
      if (nuxeo.serverVersion.lt('9.3')) {
        this.skip();
      }

      let firstToken;
      let bearerNuxeo;
      let hasRefreshedAuthentication = false;

      return fetchAccessToken()
        .then((token) => {
          firstToken = token;
          bearerNuxeo = new Nuxeo({ baseURL, auth: { clientId: CLIENT_ID, method: 'bearerToken', token } });
          bearerNuxeo.onAuthenticationRefreshed((refreshedAuth) => {
            expect(refreshedAuth.token.access_token).to.be.not.null();
            expect(refreshedAuth.token.access_token).to.be.not.equal(token.access_token);
            hasRefreshedAuthentication = true;
          });
          return bearerNuxeo.repository().fetch('/');
        })
        .then((doc) => {
          expect(doc).to.be.an.instanceof(Nuxeo.Document);
          expect(doc.uid).to.exist();
          return nuxeo.directory(OAUTH2_TOKENS_DIRECTORY_NAME).fetchAll();
        })
        .then(({ entries }) => {
          const dirEntry = entries.find((entry) => entry.properties.accessToken === firstToken.access_token);
          // expire the token
          dirEntry.set({
            id: `${dirEntry.properties.id}`,
            creationDate: '2011-10-23T12:00:00.00Z',
          });
          return dirEntry.save();
        })
        .then(() => bearerNuxeo.repository().fetch('/'))
        .then((doc) => {
          expect(hasRefreshedAuthentication).to.be.true();
          expect(doc).to.be.an.instanceof(Nuxeo.Document);
          expect(doc.uid).to.exist();
          expect(bearerNuxeo._auth.token.access_token).to.be.not.equal(firstToken.access_token);
          expect(bearerNuxeo._auth.token.refresh_token).to.be.not.equal(firstToken.refresh_token);
          return nuxeo.directory(OAUTH2_TOKENS_DIRECTORY_NAME).fetchAll();
        })
        .then(({ entries }) => {
          const cb = (entry) => entry.properties.accessToken === bearerNuxeo._auth.token.access_token;
          const dirEntry = entries.find(cb);
          // delete the token
          return nuxeo.directory(OAUTH2_TOKENS_DIRECTORY_NAME).delete(dirEntry.properties.id);
        })
        .then(() => (
          bearerNuxeo.repository().fetch('/default-domain')
            .catch((error) => {
              // not authorized anymore; cannot refresh a non-existing token
              expect(error.response.status).to.be.equal(401);
              expect(error.response.url).to.be.equal(`${baseURL}/api/v1/path/default-domain`);
            })
        ));
    });

    it('should fetch an access token from a JWT token', function f() {
      if (nuxeo.serverVersion.lt('10.10-HF02')) {
        this.skip();
      }

      const jwtToken = jwt.sign({ iss: 'nuxeo', sub: 'Administrator' }, JWT_SHARED_SECRET, { algorithm: 'HS512' });
      return Nuxeo.oauth2.fetchAccessTokenFromJWTToken(baseURL, CLIENT_ID, jwtToken)
        .then((token) => {
          expect(token).to.have.all.keys('access_token', 'refresh_token', 'token_type', 'expires_in');
        });
    });
  });
});
