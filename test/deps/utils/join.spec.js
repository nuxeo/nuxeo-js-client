const join = require('../../../lib/deps/utils/join');

describe('join', () => {
  it('should deduplicate / except for links', () => {
    expect(join('http://localhost:8080/nuxeo/', '/api/v1/', '/directory/nature'))
      .toEqual('http://localhost:8080/nuxeo/api/v1/directory/nature');
    expect(join('/directory/nature', 'http://foo.com'))
      .toEqual('/directory/nature/http://foo.com');
    expect(join('////foo/bar//', '/foobar///'))
      .toEqual('/foo/bar/foobar/');
  });
});
