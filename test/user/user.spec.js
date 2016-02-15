'use strict';

const LEELA_USERNAME = 'leela';

describe('User', () => {
  let nuxeo;
  let users;

  before(() => {
    nuxeo = new Nuxeo({ auth: { username: 'Administrator', password: 'Administrator' } });
    users = nuxeo.users();

    return users.create({
      'entity-type': 'user',
      properties: {
        username: LEELA_USERNAME,
        firstName: 'Leela',
      },
    });
  });

  after(() => {
    return users.delete(LEELA_USERNAME);
  });

  it('should be retrieved from Users', () => {
    return users.fetch('Administrator').then((user) => {
      expect(user).to.be.an.instanceof(Nuxeo.User);
      expect(user.id).to.exist();
    });
  });

  describe('#save', () => {
    it('should save an updated user', () => {
      users.fetch(LEELA_USERNAME)
        .then((user) => {
          expect(user.get('firstName')).to.be.equal('Leela');
          user.set({ firstName: 'Fry?' });
          return user.save();
        }).then((user) => {
          expect(user.get('firstName')).to.be.equal('Fry?');
        });
    });
  });
});
