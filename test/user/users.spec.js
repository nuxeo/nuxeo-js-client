const LEELA_USERNAME = 'leela';

describe('Users', () => {
  let nuxeo;
  let users;

  beforeAll(() => {
    nuxeo = new Nuxeo({ baseURL, auth: { method: 'basic', username: 'Administrator', password: 'Administrator' } });
    users = nuxeo.users();
  });

  describe('#fetch', () => {
    it('should fetch Administrator user', () => (
      users.fetch('Administrator')
        .then((user) => {
          expect(user.id).toBeDefined();
          expect(user.properties.username).toBe('Administrator');
        })
    ));
  });

  describe('#create', () => {
    it('should create a new leela user', () => {
      const newUser = {
        properties: {
          username: LEELA_USERNAME,
          password: LEELA_USERNAME,
          firstName: 'Leela',
          company: 'Futurama',
          email: 'leela@futurama.com',
        },
      };
      return users.create(newUser)
        .then((user) => {
          expect(user.id).toBeDefined();
          expect(user.properties.username).toBe(LEELA_USERNAME);
          expect(user.properties.firstName).toBe('Leela');
          expect(user.properties.lastName).toBeNull();
          expect(user.properties.company).toBe('Futurama');
          expect(user.properties.email).toBe('leela@futurama.com');
        });
    });
  });

  describe('#update', () => {
    it('should update leela user', () => (
      users.fetch(LEELA_USERNAME)
        .then((user) => {
          expect(user.properties.firstName).toBe('Leela');
          user.properties.firstName = 'Fry?';
          return users.update(user);
        })
        .then((updatedUser) => {
          expect(updatedUser.properties.firstName).toBe('Fry?');
        })
    ));
  });

  describe('#delete', () => {
    it('should delete leela user', () => (
      users.delete(LEELA_USERNAME).then((res) => {
        expect(res.status).toBe(204);
      })
    ));
  });
});
