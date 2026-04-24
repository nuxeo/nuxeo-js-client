const FOO_GROUPNAME = 'foo';

describe('Groups', () => {
  let nuxeo;
  let groups;

  beforeAll(() => {
    nuxeo = new Nuxeo({ baseURL, auth: { method: 'basic', username: 'Administrator', password: 'Administrator' } });
    groups = nuxeo.groups();
  });

  describe('#fetch', () => {
    it('should fetch administrators group', () => (
      groups.fetch('administrators')
        .then((group) => {
          expect(group.id).toBeDefined();
          expect(group.groupname).toBe('administrators');
          expect(group.grouplabel).toBe('Administrators group');
        })
    ));
  });

  describe('#create', () => {
    it('should create a new foo group', () => {
      const newGroup = {
        groupname: FOO_GROUPNAME,
        grouplabel: 'Foo',
        memberUsers: ['Administrator'],
      };
      return groups.create(newGroup)
        .then((group) => {
          expect(group.groupname).toBe(FOO_GROUPNAME);
          expect(group.grouplabel).toBe('Foo');
        });
    });
  });

  describe('#update', () => {
    it('should update foo group', () => (
      groups.fetch(FOO_GROUPNAME).then((group) => {
        expect(group.grouplabel).toBe('Foo');
        group.grouplabel = 'Foo Fighters';
        return groups.update(group);
      }).then((updatedGroup) => {
        expect(updatedGroup.grouplabel).toBe('Foo Fighters');
      })
    ));
  });

  describe('#delete', () => {
    it('should delete foo group', () => (
      groups.delete(FOO_GROUPNAME).then((res) => {
        expect(res.status).toBe(204);
      })
    ));
  });
});
