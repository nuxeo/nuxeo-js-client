describe('Base', () => {
  it('should have default values', () => {
    const base = new Nuxeo.Base();
    expect(base._baseOptions.repositoryName).to.be.equal('default');
    expect(base._baseOptions.schemas).to.be.eql([]);
    expect(base._baseOptions.headers).to.be.eql({});
    expect(base._baseOptions.enrichers).to.be.eql({});
    expect(base._baseOptions.fetchProperties).to.be.eql({});
    expect(base._baseOptions.depth).to.be.undefined();
    expect(base._baseOptions.timeout).to.be.undefined();
    expect(base._baseOptions.httpTimeout).to.be.equal(30000);
    expect(base._baseOptions.transactionTimeout).to.be.undefined();
  });

  it('should allow changing values', () => {
    const base = new Nuxeo.Base();
    base.repositoryName('test');
    expect(base._baseOptions.repositoryName).to.be.equal('test');
    base.schemas(['file', 'common']);
    expect(base._baseOptions.schemas).to.be.eql(['file', 'common']);
    base.schemas(['dublincore']);
    expect(base._baseOptions.schemas).to.be.eql(['dublincore']);
    base.headers({
      'content-type': 'application/json',
      Accepts: 'application/json',
    }).headers({
      'content-type': 'plain/text',
      'properties': 'dublincore',
    });
    expect(base._baseOptions.headers).to.be.eql({
      'content-type': 'plain/text',
      'properties': 'dublincore',
    });
    base.header('Accepts', 'plain/text');
    expect(base._baseOptions.headers).to.be.eql({
      'content-type': 'plain/text',
      'properties': 'dublincore',
      Accepts: 'plain/text',
    });
    base.timeout(10000).httpTimeout(50000).transactionTimeout(333);
    expect(base._baseOptions.timeout).to.be.equal(10000);
    expect(base._baseOptions.httpTimeout).to.be.equal(50000);
    expect(base._baseOptions.transactionTimeout).to.be.equal(333);

    base.enrichers({ document: ['acls', 'permissions'] });
    expect(base._baseOptions.enrichers).to.be.eql({
      document: ['acls', 'permissions'],
    });
    base.enrichers({ user: ['groups'] });
    expect(base._baseOptions.enrichers).to.be.eql({
      user: ['groups'],
    });
    base.enricher('document', 'acls');
    expect(base._baseOptions.enrichers).to.be.eql({
      user: ['groups'],
      document: ['acls'],
    });

    base.fetchProperties({ document: ['dc:creator', 'dc:coverage'] });
    expect(base._baseOptions.fetchProperties).to.be.eql({
      document: ['dc:creator', 'dc:coverage'],
    });
    base.fetchProperties({ user: ['memberGroups'] });
    expect(base._baseOptions.fetchProperties).to.be.eql({
      user: ['memberGroups'],
    });
    base.fetchProperty('document', 'dc:creator');
    expect(base._baseOptions.fetchProperties).to.be.eql({
      user: ['memberGroups'],
      document: ['dc:creator'],
    });

    base.depth('children');
    expect(base._baseOptions.depth).to.be.equal('children');
    base.depth('root');
    expect(base._baseOptions.depth).to.be.equal('root');
  });
});
