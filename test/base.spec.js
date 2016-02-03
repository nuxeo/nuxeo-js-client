'use strict';

describe('Base', () => {
  it('should have default values', () => {
    const base = new Nuxeo.Base();
    expect(base._repositoryName).to.be.equal('default');
    expect(base._schemas).to.be.eql([]);
    expect(base._headers).to.be.eql({});
    expect(base._auth).to.be.undefined();
    expect(base._timeout).to.be.equal(30000);
    expect(base._httpTimeout).to.be.undefined();
    expect(base._transactionTimeout).to.be.undefined();
  });

  it('should allow changing values', () => {
    const base = new Nuxeo.Base();
    base.repositoryName('test');
    expect(base._repositoryName).to.be.equal('test');
    base.schemas(['file', 'common']);
    expect(base._schemas).to.be.eql(['file', 'common']);
    base.schemas(['dublincore']);
    expect(base._schemas).to.be.eql(['dublincore']);
    base.headers({
      'content-type': 'application/json',
      Accepts: 'application/json',
    }).headers({
      'content-type': 'plain/text',
      'X-NXDocumentProperties': 'dublincore',
    });
    expect(base._headers).to.be.eql({
      'content-type': 'plain/text',
      'X-NXDocumentProperties': 'dublincore',
      Accepts: 'application/json',
    });
    base.header('Accepts', 'plain/text');
    expect(base._headers).to.be.eql({
      'content-type': 'plain/text',
      'X-NXDocumentProperties': 'dublincore',
      Accepts: 'plain/text',
    });
    base.timeout(10000).httpTimeout(50000).transactionTimeout(333);
    expect(base._timeout).to.be.equal(10000);
    expect(base._httpTimeout).to.be.equal(50000);
    expect(base._transactionTimeout).to.be.equal(333);
  });
});
