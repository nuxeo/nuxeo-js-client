const qs = require('querystring');

const fetch = require('../lib/deps/fetch');
const { btoa } = require('../lib/deps/utils/base64');

const OAUTH2_CLIENTS_DIRECTORY_NAME = 'oauth2Clients';

describe('OAuth2 spec', () => {
  let nuxeo;
  let oauth2Client;

  before(function f() {
    nuxeo = new Nuxeo({
      auth: {
        method: 'basic',
        username: 'Administrator',
        password: 'Administrator',
      },
    });

    // create a OAuth2 client for the tests
    return nuxeo.connect()
      .then(() => {
        if (nuxeo.nuxeoVersion < '9.2') {
          this.skip();
        }

        return nuxeo.directory(OAUTH2_CLIENTS_DIRECTORY_NAME).create({
          properties: {
            name: 'Test Client',
            clientId: 'test-client',
            redirectURIs: 'http://localhost:8080/nuxeo/home.html',
          },
        });
      })
      .then((entry) => { oauth2Client = entry; });
  });

  after(function f() {
    if (nuxeo.nuxeoVersion < '9.2') {
      this.skip();
    }
    return nuxeo.directory(OAUTH2_CLIENTS_DIRECTORY_NAME).delete(oauth2Client.properties.id);
  });

  describe('Authorization URL', () => {
    it('should compute an authorization URL without params', function f() {
      if (nuxeo.nuxeoVersion < '9.2') {
        this.skip();
      }

      const url = Nuxeo.oauth2.getAuthorizationURL('http://localhost:8080/nuxeo', 'test-client');
      expect(url.startsWith('http://localhost:8080/nuxeo/oauth2/authorize?')).to.be.true();
      expect(url).to.include('client_id=test-client');
      expect(url).to.include('response_type=code');
    });

    it('should compute an authorization URL with additional params', function f() {
      if (nuxeo.nuxeoVersion < '9.2') {
        this.skip();
      }

      const url = Nuxeo.oauth2.getAuthorizationURL('http://localhost:8080/nuxeo/', 'test-client', {
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

    it('should throw an error if missing arguments', function f() {
      if (nuxeo.nuxeoVersion < '9.2') {
        this.skip();
      }

      expect(() => { Nuxeo.oauth2.getAuthorizationURL('http://localhost:8080/nuxeo'); })
        .to.throw(Error, 'Missing `clientId` argument');
      expect(() => { Nuxeo.oauth2.getAuthorizationURL(null, 'test-client'); })
        .to.throw(Error, 'Missing `baseURL` argument');
    });
  });

  function fetchAccessToken() {
    const url = Nuxeo.oauth2.getAuthorizationURL('http://localhost:8080/nuxeo', 'test-client');
    const base64 = btoa('Administrator:Administrator');
    const authorization = `Basic ${base64}`;
    return fetch(url, { headers: { Authorization: authorization } })
      .then((res) => res.text())
      .then((text) => {
        const match = text.match(/name="authorization_key" type="hidden" value="(.*?)"/);
        const submitURL = url.replace(/authorize.*/, 'authorize_submit');
        return fetch(submitURL, {
          method: 'POST',
          body: qs.stringify({ authorization_key: match[1], grant_access: '1' }),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: authorization,
          },
        });
      })
      .then((res) => {
        const queryParameters = res.url.substring(res.url.indexOf('?') + 1);
        const parameters = qs.parse(queryParameters);
        return Nuxeo.oauth2.fetchAccessToken('http://localhost:8080/nuxeo', 'test-client', parameters.code);
      });
  }

  describe('Access Token', () => {
    it('should fetch an access token', function f () {
      if (nuxeo.nuxeoVersion < '9.2') {
        this.skip();
      }

      return fetchAccessToken()
        .then((token) => {
          expect(token).to.have.all.keys('access_token', 'refresh_token', 'token_type', 'expires_in');
        });
    });

    it('should authenticate using bearer token authentication method', function f() {
      if (nuxeo.nuxeoVersion < '9.2') {
        this.skip();
      }

      return fetchAccessToken()
        .then((token) => {
          const bearerNuxeo = new Nuxeo({ auth: { method: 'bearerToken', token: token.access_token } });
          return bearerNuxeo.repository().fetch('/')
            .then((doc) => {
              expect(doc).to.be.an.instanceof(Nuxeo.Document);
              expect(doc.uid).to.exist();
            });
        });
    });

    it('should refresh an access token', function f() {
      if (nuxeo.nuxeoVersion < '9.2') {
        this.skip();
      }

      let firstToken;
      return fetchAccessToken()
        .then((token) => {
          firstToken = token;
          const bearerNuxeo = new Nuxeo({ auth: { method: 'bearerToken', token } });
          return bearerNuxeo.repository().fetch('/');
        })
        .then((doc) => {
          expect(doc).to.be.an.instanceof(Nuxeo.Document);
          expect(doc.uid).to.exist();
          return Nuxeo.oauth2.refreshAccessToken('http://localhost:8080/nuxeo', 'test-client', firstToken.refresh_token);
        })
        .then((token) => {
          const bearerNuxeo = new Nuxeo({ auth: { method: 'bearerToken', token: token.access_token } });
          return bearerNuxeo.repository().fetch('/');
        })
        .then((doc) => {
          expect(doc).to.be.an.instanceof(Nuxeo.Document);
          expect(doc.uid).to.exist();
          const bearerNuxeo = new Nuxeo({ auth: { method: 'bearerToken', token: firstToken } });
          return bearerNuxeo.repository().fetch('/default-domain');
        })
        .catch((error) => {
          expect(error.response.url).to.be.equal('http://localhost:8080/nuxeo/api/v1/repo/default/path/default-domain');
          expect(error.response.status).to.be.equal(401);
        });
    });
  });
});
