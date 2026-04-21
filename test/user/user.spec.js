const LEELA_USERNAME = 'leela';

describe('User', () => {
  let nuxeo;
  let users;

  beforeAll(() => {
    nuxeo = new Nuxeo({ baseURL, auth: { method: 'basic', username: 'Administrator', password: 'Administrator' } });
    users = nuxeo.users();

    return users.create({
      'entity-type': 'user',
      properties: {
        username: LEELA_USERNAME,
        password: LEELA_USERNAME,
        firstName: 'Leela',
      },
    });
  });

  afterAll(() => users.delete(LEELA_USERNAME));

  it('should be retrieved from Users', () => (
    users.fetch('Administrator')
      .then((user) => {
        expect(user).toBeInstanceOf(Nuxeo.User);
        expect(user.id).toBeDefined();
      })
  ));

  describe('#set', () => {
    it('should fill only dirtyProperties field', () => (
      users.fetch(LEELA_USERNAME).then((user) => {
        user.set({
          lastName: 'foo',
        });
        expect(user.properties.lastName).toBeNull();
        expect(user._dirtyProperties.lastName).toBe('foo');
      })
    ));
  });

  describe('#get', () => {
    it('should return a property value', () => (
      users.fetch(LEELA_USERNAME).then((user) => {
        expect(user.get('firstName')).toBe('Leela');
      })
    ));

    it('should return undefined for non existing property', () => (
      users.fetch(LEELA_USERNAME).then((user) => {
        expect(user.get('non-existing')).toBeUndefined();
      })
    ));

    it('should return the dirty property value if any', () => (
      users.fetch(LEELA_USERNAME).then((user) => {
        user.set({
          lastName: 'foo',
        });
        expect(user.get('lastName')).toBe('foo');
      })
    ));
  });

  describe('#save', () => {
    it('should save an updated user', () => (
      users.fetch(LEELA_USERNAME)
        .then((user) => {
          expect(user.get('firstName')).toBe('Leela');
          user.set({ firstName: 'Fry?' });
          return user.save();
        }).then((user) => {
          expect(user.get('firstName')).toBe('Fry?');
        })
    ));
  });
});
