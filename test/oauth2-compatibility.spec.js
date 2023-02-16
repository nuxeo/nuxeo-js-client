const qs = require('querystring');
const jwt = require('jsonwebtoken');

const fetch = require('../lib/deps/fetch');
const { btoa } = require('../lib/deps/utils/base64');

const OAUTH2_CLIENTS_DIRECTORY_NAME = 'oauth2Clients';
const OAUTH2_TOKENS_DIRECTORY_NAME = 'oauth2Tokens';
const JWT_SHARED_SECRET = 'abracadabra';

const CLIENT_ID = 'test-client';
const CLIENT_WITH_SECRET_ID = 'test-client-secret';
const CLIENT_SECRET = 'secret';

// test functions to mutualize tests with or without client secret
function fetchAccessToken(clientId, clientSecret) {
  const params = typeof clientSecret === 'undefined' ? {} : { client_secret: clientSecret };
  const url = Nuxeo.oauth2.getAuthorizationURL(baseURL, clientId, params);
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
    return Nuxeo.oauth2.fetchAccessTokenFromAuthorizationCode(baseURL, clientId, parameters.code, params);
  });
}

function testAuthorizationURLWithoutParams(clientId, clientSecret) {
  const params = { client_secret: clientSecret };
  const url = Nuxeo.oauth2.getAuthorizationURL('http://localhost:8080/nuxeo', clientId, params);
  expect(url.startsWith('http://localhost:8080/nuxeo/oauth2/authorize?')).to.be.true();
  expect(url).to.include(`client_id=${clientId}`);
  expect(url).to.include('response_type=code');
  if (typeof clientSecret !== 'undefined') {
    expect(url).to.include(`client_secret=${clientSecret}`);
  }
}

function testAuthorizationURLWithAdditionalParams(clientId, clientSecret) {
  const params = {
    client_secret: clientSecret,
    redirect_uri: 'http://localhost:8000/authorize',
    state: 'xyz',
    response_type: 'token',
  };

  const url = Nuxeo.oauth2.getAuthorizationURL('http://localhost:8080/nuxeo/', clientId, params);
  expect(url.startsWith('http://localhost:8080/nuxeo/oauth2/authorize?')).to.be.true();
  expect(url).to.include(`client_id=${clientId}`);
  if (clientSecret) {
    expect(url).to.include(`client_secret=${clientSecret}`);
  }
  expect(url).to.include('state=xyz');
  expect(url).to.include('redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fauthorize');
  expect(url).to.include('response_type=token');
}

function testAuthorizationURLMissingArguments(clientId) {
  expect(() => { Nuxeo.oauth2.getAuthorizationURL('http://localhost:8080/nuxeo', null); })
    .to.throw(Error, 'Missing `clientId` argument');
  expect(() => { Nuxeo.oauth2.getAuthorizationURL(null, clientId); })
    .to.throw(Error, 'Missing `baseURL` argument');
}

function testAccessTokenFromAuthorizationCode(clientId, clientSecret) {
  return fetchAccessToken(clientId, clientSecret)
    .then((token) => {
      expect(token).to.have.all.keys('access_token', 'refresh_token', 'token_type', 'expires_in');
    });
}

function testAuthenticateWithBearerToken(clientId, clientSecret) {
  return fetchAccessToken(clientId, clientSecret)
    .then((token) => {
      const bearerNuxeo = new Nuxeo({
        baseURL,
        auth: { CLIENT_WITH_SECRET_ID, method: 'bearerToken', token: token.access_token },
      });
      return bearerNuxeo.repository().fetch('/')
        .then((doc) => {
          expect(doc).to.be.an.instanceof(Nuxeo.Document);
          expect(doc.uid).to.exist();
        });
    });
}

function testAccessTokenManualRefresh(clientId, clientSecret) {
  let firstToken;
  return fetchAccessToken(clientId, clientSecret)
    .then((token) => {
      firstToken = token;
      const bearerNuxeo = new Nuxeo({
        baseURL,
        auth: {
          method: 'bearerToken',
          token,
          clientId,
          clientSecret,
        },
      });
      return bearerNuxeo.repository().fetch('/');
    })
    .then((doc) => {
      expect(doc).to.be.an.instanceof(Nuxeo.Document);
      expect(doc.uid).to.exist();
      return Nuxeo.oauth2.refreshAccessToken(
        baseURL, clientId, firstToken.refresh_token, { client_secret: clientSecret });
    })
    .then((token) => {
      const bearerNuxeo = new Nuxeo({
        baseURL,
        auth: {
          method: 'bearerToken',
          token: token.access_token,
          clientId,
          clientSecret,
        },
      });
      return bearerNuxeo.repository().fetch('/');
    })
    .then((doc) => {
      expect(doc).to.be.an.instanceof(Nuxeo.Document);
      expect(doc.uid).to.exist();
      const bearerNuxeo = new Nuxeo({
        baseURL,
        auth: {
          method: 'bearerToken',
          token: firstToken,
          clientId,
          clientSecret,
        },
      });
      return bearerNuxeo.repository().fetch('/default-domain')
        .catch((error) => {
          expect(error.response.url).to.be.equal(`${baseURL}/api/v1/path/default-domain`);
          expect(error.response.status).to.be.equal(401);
        });
    });
}

function testAccessTokenAutomaticRefresh(adminNuxeo, clientId, clientSecret) {
  let firstToken;
  let bearerNuxeo;
  let hasRefreshedAuthentication = false;

  return fetchAccessToken(clientId, clientSecret)
    .then((token) => {
      firstToken = token;
      bearerNuxeo = new Nuxeo({
        baseURL,
        auth: {
          method: 'bearerToken',
          token,
          clientId,
          clientSecret,
        },
      });
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
      return adminNuxeo.directory(OAUTH2_TOKENS_DIRECTORY_NAME).fetchAll();
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
      return adminNuxeo.directory(OAUTH2_TOKENS_DIRECTORY_NAME).fetchAll();
    })
    .then(({ entries }) => {
      const cb = (entry) => entry.properties.accessToken === bearerNuxeo._auth.token.access_token;
      const dirEntry = entries.find(cb);
      // delete the token
      return adminNuxeo.directory(OAUTH2_TOKENS_DIRECTORY_NAME).delete(dirEntry.properties.id);
    })
    .then(() => (
      bearerNuxeo.repository().fetch('/default-domain')
        .catch((error) => {
          // not authorized anymore; cannot refresh a non-existing token
          expect(error.response.status).to.be.equal(401);
          expect(error.response.url).to.be.equal(`${baseURL}/api/v1/path/default-domain`);
        })
    ));
}

function testAccessTokenFromJWTToken(clientId, clientSecret) {
  const jwtToken = jwt.sign({ iss: 'nuxeo', sub: 'Administrator' }, JWT_SHARED_SECRET, { algorithm: 'HS512' });
  const params = { client_secret: clientSecret };
  return Nuxeo.oauth2.fetchAccessTokenFromJWTToken(baseURL, clientId, jwtToken, params)
    .then((token) => {
      expect(token).to.have.all.keys('access_token', 'refresh_token', 'token_type', 'expires_in');
    });
}

describe('OAuth2 Compatibility spec', () => {
  let nuxeo;
  let oauth2Client;
  let oauth2ClientWithSecret;

  before(function f() {
    nuxeo = new Nuxeo({
      baseURL,
      auth: {
        method: 'basic',
        username: 'Administrator',
        password: 'Administrator',
      },
    });

    // create OAuth2 clients for the tests
    return nuxeo.connect()
      .then(() => {
        if (nuxeo.serverVersion.lt('9.2')) {
          this.skip();
        }
      })
      .then(() => (
        nuxeo.directory(OAUTH2_CLIENTS_DIRECTORY_NAME).create({
          properties: {
            name: 'Test Client',
            clientId: CLIENT_ID,
            redirectURIs: `${baseURL}/home.html`,
          },
        })
      ))
      .then((entry) => { oauth2Client = entry; })
      .then(() => (
        nuxeo.directory(OAUTH2_CLIENTS_DIRECTORY_NAME).create({
          properties: {
            name: 'Test Client With Secret',
            clientId: CLIENT_WITH_SECRET_ID,
            clientSecret: CLIENT_SECRET,
            redirectURIs: `${baseURL}/home.html`,
          },
        })
      ))
      .then((entry) => { oauth2ClientWithSecret = entry; });
  });

  after(() => {
    const oauth2ClientsDir = nuxeo.directory(OAUTH2_CLIENTS_DIRECTORY_NAME);
    const oauth2TokensDir = nuxeo.directory(OAUTH2_TOKENS_DIRECTORY_NAME);
    return oauth2ClientsDir.delete(oauth2Client.properties.id)
      .then(() => oauth2ClientsDir.delete(oauth2ClientWithSecret.properties.id))
      .then(() => oauth2TokensDir.fetchAll())
      .then(({ entries }) => Promise.all(entries.map((entry) => oauth2TokensDir.delete(entry.properties.id))));
  });

  describe('OAuth client without a client secret', () => {
    describe('Authorization URL', () => {
      it('should compute an authorization URL without params', () => {
        testAuthorizationURLWithoutParams(CLIENT_ID);
      });

      it('should compute an authorization URL with additional params', () => {
        testAuthorizationURLWithAdditionalParams(CLIENT_ID);
      });

      it('should throw an error if missing arguments', () => {
        testAuthorizationURLMissingArguments(CLIENT_ID);
      });
    });

    describe('Access Token', () => {
      before(function f() {
        if (isBrowser) {
          this.skip();
        }
      });

      it('should fetch an access token from an authorization code', () => (
        testAccessTokenFromAuthorizationCode(CLIENT_ID)
      ));

      it('should authenticate using bearer token authentication method', () => (
        testAuthenticateWithBearerToken(CLIENT_ID)
      ));

      it('should refresh manually an access token', () => (
        testAccessTokenManualRefresh(CLIENT_ID)
      ));

      it('should refresh automatically an access token', function f() {
        if (nuxeo.serverVersion.lt('9.3')) {
          this.skip();
        }

        return testAccessTokenAutomaticRefresh(nuxeo, CLIENT_ID);
      });

      it('should fetch an access token from a JWT token', function f() {
        if (nuxeo.serverVersion.lt('10.10-HF02')) {
          this.skip();
        }

        return testAccessTokenFromJWTToken(CLIENT_ID);
      });
    });
  });

  describe('OAuth client with a client secret', () => {
    describe('Authorization URL', () => {
      it('should compute an authorization URL without params', () => {
        testAuthorizationURLWithoutParams(CLIENT_WITH_SECRET_ID, CLIENT_SECRET);
      });

      it('should compute an authorization URL with additional params', () => {
        testAuthorizationURLWithAdditionalParams(CLIENT_WITH_SECRET_ID, CLIENT_SECRET);
      });

      it('should throw an error if missing arguments', () => {
        testAuthorizationURLMissingArguments(CLIENT_WITH_SECRET_ID);
      });
    });

    describe('Access Token', () => {
      before(function f() {
        if (isBrowser) {
          this.skip();
        }
      });

      it('should fetch an access token from an authorization code', () => (
        testAccessTokenFromAuthorizationCode(CLIENT_WITH_SECRET_ID, CLIENT_SECRET)
      ));

      it('should authenticate using bearer token authentication method', () => (
        testAuthenticateWithBearerToken(CLIENT_WITH_SECRET_ID, CLIENT_SECRET)
      ));

      it('should refresh manually an access token', () => (
        testAccessTokenManualRefresh(CLIENT_WITH_SECRET_ID, CLIENT_SECRET)
      ));

      it('should refresh automatically an access token', function f() {
        if (nuxeo.serverVersion.lt('9.3')) {
          this.skip();
        }

        return testAccessTokenAutomaticRefresh(nuxeo, CLIENT_WITH_SECRET_ID, CLIENT_SECRET);
      });

      it('should fetch an access token from a JWT token', function f() {
        if (nuxeo.serverVersion.lt('10.10-HF02')) {
          this.skip();
        }

        return testAccessTokenFromJWTToken(CLIENT_WITH_SECRET_ID, CLIENT_SECRET);
      });
    });
  });
});
