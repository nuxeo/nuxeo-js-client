describe('Base', () => {
  it('should have default values', () => {
    const base = new Nuxeo.Base();
    expect(base._baseOptions.repositoryName).toBeUndefined();
    expect(base._baseOptions.schemas).toEqual([]);
    expect(base._baseOptions.headers).toEqual({});
    expect(base._baseOptions.enrichers).toEqual({});
    expect(base._baseOptions.fetchProperties).toEqual({});
    expect(base._baseOptions.depth).toBeUndefined();
    expect(base._baseOptions.timeout).toBeUndefined();
    expect(base._baseOptions.httpTimeout).toBe(30000);
    expect(base._baseOptions.transactionTimeout).toBeUndefined();
  });

  it('should allow changing values', () => {
    const base = new Nuxeo.Base();
    base.repositoryName('test');
    expect(base._baseOptions.repositoryName).toBe('test');
    base.schemas(['file', 'common']);
    expect(base._baseOptions.schemas).toEqual(['file', 'common']);
    base.schemas(['dublincore']);
    expect(base._baseOptions.schemas).toEqual(['dublincore']);
    base.headers({
      'content-type': 'application/json',
      Accepts: 'application/json',
    }).headers({
      'content-type': 'plain/text',
      properties: 'dublincore',
    });
    expect(base._baseOptions.headers).toEqual({
      'content-type': 'plain/text',
      properties: 'dublincore',
    });
    base.header('Accepts', 'plain/text');
    expect(base._baseOptions.headers).toEqual({
      'content-type': 'plain/text',
      properties: 'dublincore',
      Accepts: 'plain/text',
    });
    base.timeout(10000).httpTimeout(50000).transactionTimeout(333);
    expect(base._baseOptions.timeout).toBe(10000);
    expect(base._baseOptions.httpTimeout).toBe(50000);
    expect(base._baseOptions.transactionTimeout).toBe(333);

    base.enrichers({ document: ['acls', 'permissions'] });
    expect(base._baseOptions.enrichers).toEqual({
      document: ['acls', 'permissions'],
    });
    base.enrichers({ document: ['breadcrumb'] }, false);
    expect(base._baseOptions.enrichers).toEqual({
      document: ['acls', 'permissions', 'breadcrumb'],
    });
    base.enrichers({ user: ['groups'] });
    expect(base._baseOptions.enrichers).toEqual({
      user: ['groups'],
    });
    base.enricher('document', 'acls');
    expect(base._baseOptions.enrichers).toEqual({
      user: ['groups'],
      document: ['acls'],
    });

    base.fetchProperties({ document: ['dc:creator', 'dc:coverage'] });
    expect(base._baseOptions.fetchProperties).toEqual({
      document: ['dc:creator', 'dc:coverage'],
    });
    base.fetchProperties({ document: ['dc:nature'] }, false);
    expect(base._baseOptions.fetchProperties).toEqual({
      document: ['dc:creator', 'dc:coverage', 'dc:nature'],
    });
    base.fetchProperties({ user: ['memberGroups'] });
    expect(base._baseOptions.fetchProperties).toEqual({
      user: ['memberGroups'],
    });
    base.fetchProperty('document', 'dc:creator');
    expect(base._baseOptions.fetchProperties).toEqual({
      user: ['memberGroups'],
      document: ['dc:creator'],
    });

    base.translateProperties({ directoryEntry: ['label'] });
    expect(base._baseOptions.translateProperties).toEqual({
      directoryEntry: ['label'],
    });
    base.translateProperties({ directoryEntry: ['label2'] }, false);
    expect(base._baseOptions.translateProperties).toEqual({
      directoryEntry: ['label', 'label2'],
    });
    base.translateProperties({ user: ['username'] });
    expect(base._baseOptions.translateProperties).toEqual({
      user: ['username'],
    });
    base.translateProperty('directoryEntry', 'label');
    expect(base._baseOptions.translateProperties).toEqual({
      user: ['username'],
      directoryEntry: ['label'],
    });

    base.depth('children');
    expect(base._baseOptions.depth).toBe('children');
    base.depth('root');
    expect(base._baseOptions.depth).toBe('root');
  });
});
