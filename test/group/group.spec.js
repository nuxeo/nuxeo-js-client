const FOO_GROUPNAME = 'foo';

describe('Group', () => {
  let nuxeo;
  let groups;

  beforeAll(() => {
    nuxeo = new Nuxeo({ baseURL, auth: { method: 'basic', username: 'Administrator', password: 'Administrator' } });
    groups = nuxeo.groups();

    return groups.create({
      'entity-type': 'group',
      groupname: FOO_GROUPNAME,
      grouplabel: 'Foo',
    });
  });

  afterAll(() => groups.delete(FOO_GROUPNAME));

  it('should be retrieved from Groups', () => (
    groups.fetch('administrators').then((group) => {
      expect(group).toBeInstanceOf(Nuxeo.Group);
      expect(group.groupname).toBeDefined();
    })
  ));

  describe('#save', () => {
    it('should save an updated group', () => (
      groups.fetch(FOO_GROUPNAME)
        .then((group) => {
          expect(group.grouplabel).toBe('Foo');
          group.grouplabel = 'Foo Fighters';
          return group.save();
        }).then((group) => {
          expect(group.grouplabel).toBe('Foo Fighters');
        })
    ));
  });
});
