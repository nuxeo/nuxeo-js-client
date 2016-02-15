'use strict';

const FOO_GROUPNAME = 'foo';

describe('Group', () => {
  let nuxeo;
  let groups;

  before(() => {
    nuxeo = new Nuxeo({ auth: { username: 'Administrator', password: 'Administrator' } });
    groups = nuxeo.groups();

    return groups.create({
      'entity-type': 'group',
      groupname: FOO_GROUPNAME,
    });
  });

  after(() => {
    return groups.delete(FOO_GROUPNAME);
  });

  it('should be retrieved from Nuxeo.user', () => {
    return groups.fetch('administrators').then((group) => {
      expect(group).to.be.an.instanceof(Nuxeo.Group);
      expect(group.groupname).to.exist();
    });
  });

  describe('#save', () => {
    it('should save an updated group', () => {
      groups.fetch(FOO_GROUPNAME)
        .then((group) => {
          expect(group.grouplabel).to.be.null();
          group.grouplabel = 'Foo';
          return group.save();
        }).then((group) => {
          expect(group.grouplabel).to.be.equal('Foo');
        });
    });
  });
});
