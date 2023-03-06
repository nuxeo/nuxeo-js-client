const join = require('../../../lib/deps/utils/join');

describe('join', () => {
  it('should deduplicate / between segments only', () => {
    expect(join('http://localhost:8080/nuxeo/', '/api/v1/', '/directory/nature'))
      .to.be.eql('http://localhost:8080/nuxeo/api/v1/directory/nature');
    expect(join('/directory/nature', 'http://foo.com'))
      .to.be.eql('/directory/nature/http://foo.com');
    expect(join('////foo/bar//', '/foobar///'))
      .to.be.eql('////foo/bar/foobar///');
  });
});
