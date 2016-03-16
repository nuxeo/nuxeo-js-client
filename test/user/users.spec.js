'use strict';

const LEELA_USERNAME = 'leela';

describe('Users', () => {
  let nuxeo;
  let users;

  before(() => {
    nuxeo = new Nuxeo({ auth: { method: 'basic', username: 'Administrator', password: 'Administrator' } });
    users = nuxeo.users();
  });

  describe('#fetch', () => {
    it('should fetch Administrator user', () => {
      return users.fetch('Administrator')
        .then((user) => {
          expect(user.id).to.be.equal('Administrator');
        });
    });
  });

  describe('#create', () => {
    it('should create a new leela user', () => {
      const newUser = {
        properties: {
          username: LEELA_USERNAME,
          firstName: 'Leela',
          company: 'Futurama',
          email: 'leela@futurama.com',
        },
      };
      return users.create(newUser)
        .then((user) => {
          expect(user.id).to.be.equal(LEELA_USERNAME);
          expect(user.properties.firstName).to.be.equal('Leela');
          expect(user.properties.lastName).to.be.null();
          expect(user.properties.company).to.be.equal('Futurama');
          expect(user.properties.email).to.be.equal('leela@futurama.com');
        });
    });
  });

  describe('#update', () => {
    it('should update leela user', () => {
      return users.fetch(LEELA_USERNAME).then((user) => {
        expect(user.properties.firstName).to.be.equal('Leela');
        user.properties.firstName = 'Fry?';
        return users.update(user);
      }).then((updatedUser) => {
        expect(updatedUser.properties.firstName).to.be.equal('Fry?');
      });
    });
  });

  describe('#delete', () => {
    it('should delete leela user', () => {
      return users.delete(LEELA_USERNAME).then((res) => {
        expect(res.status).to.be.equal(204);
      });
    });
  });
});
