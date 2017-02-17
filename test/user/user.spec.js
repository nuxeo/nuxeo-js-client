const LEELA_USERNAME = 'leela';

describe('User', () => {
  let nuxeo;
  let users;

  before(() => {
    nuxeo = new Nuxeo({ auth: { method: 'basic', username: 'Administrator', password: 'Administrator' } });
    users = nuxeo.users();

    return users.create({
      'entity-type': 'user',
      properties: {
        username: LEELA_USERNAME,
        firstName: 'Leela',
      },
    });
  });

  after(() => users.delete(LEELA_USERNAME));

  it('should be retrieved from Users', () => (
    users.fetch('Administrator')
      .then((user) => {
        expect(user).to.be.an.instanceof(Nuxeo.User);
        expect(user.id).to.exist();
      })
  ));

  describe('#set', () => {
    it('should fill only dirtyProperties field', () => (
      users.fetch(LEELA_USERNAME).then((user) => {
        user.set({
          lastName: 'foo',
        });
        expect(user.properties.lastName).to.be.null();
        expect(user._dirtyProperties.lastName).to.be.equal('foo');
      })
    ));
  });

  describe('#get', () => {
    it('should return a property value', () => (
      users.fetch(LEELA_USERNAME).then((user) => {
        expect(user.get('firstName')).to.be.equal('Leela');
      })
    ));

    it('should return undefined for non existing property', () => (
      users.fetch(LEELA_USERNAME).then((user) => {
        expect(user.get('non-existing')).to.be.undefined();
      })
    ));

    it('should return the dirty property value if any', () => (
      users.fetch(LEELA_USERNAME).then((user) => {
        user.set({
          lastName: 'foo',
        });
        expect(user.get('lastName')).to.be.equal('foo');
      })
    ));
  });

  describe('#save', () => {
    it('should save an updated user', () => (
      users.fetch(LEELA_USERNAME)
        .then((user) => {
          expect(user.get('firstName')).to.be.equal('Leela');
          user.set({ firstName: 'Fry?' });
          return user.save();
        }).then((user) => {
          expect(user.get('firstName')).to.be.equal('Fry?');
        })
    ));
  });
});
