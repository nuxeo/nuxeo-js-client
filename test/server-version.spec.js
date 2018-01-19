const ServerVersion = require('../lib/server-version');

describe('ServerVersion', () => {
  describe('#constructor', () => {
    it('should parse known server versions', () => {
      let version = new ServerVersion('9.10');
      expect(version.major).to.equal(9);
      expect(version.minor).to.equal(10);
      expect(version.hotfix).to.be.equal(-1);

      version = new ServerVersion('7.10-HF31');
      expect(version.major).to.equal(7);
      expect(version.minor).to.equal(10);
      expect(version.hotfix).to.be.equal(31);

      version = new ServerVersion('8.10-SNAPSHOT');
      expect(version.major).to.equal(8);
      expect(version.minor).to.equal(10);
      expect(version.hotfix).to.be.equal(-1);

      version = new ServerVersion('8.10-I20180101_1522');
      expect(version.major).to.equal(8);
      expect(version.minor).to.equal(10);
      expect(version.hotfix).to.be.equal(-1);
    });

    it('should throw an error for unknown version format', () => {
      expect(() => new ServerVersion('BAD_VERSION')).to.throw('Unknown Nuxeo Server version: BAD_VERSION');
      expect(() => new ServerVersion('9_10')).to.throw('Unknown Nuxeo Server version: 9_10');
    });
  });

  it('#toString', () => {
    const version = new ServerVersion('9.10');
    expect(version.toString()).to.equal('9.10');
  });

  it('#eq', () => {
    // equal versions
    let version1 = new ServerVersion('9.10');
    let version2 = new ServerVersion('9.10');
    expect(version1.eq(version2)).to.be.true();

    version1 = new ServerVersion('8.10');
    version2 = new ServerVersion('8.10-SNAPSHOT');
    expect(version1.eq(version2)).to.be.true();

    version1 = new ServerVersion('7.10');
    version2 = new ServerVersion('7.10-I20180101_1212');
    expect(version1.eq(version2)).to.be.true();

    version1 = new ServerVersion('6.0-HF44');
    expect(version1.eq('6.0-HF44')).to.be.true();

    // non-equal versions
    version1 = new ServerVersion('9.10');
    version2 = new ServerVersion('8.10');
    expect(version1.eq(version2)).to.be.false();

    version1 = new ServerVersion('7.10');
    version2 = new ServerVersion('6.0');
    expect(version1.eq(version2)).to.be.false();

    version1 = new ServerVersion('8.10-SNAPSHOT');
    version2 = new ServerVersion('7.10');
    expect(version1.eq(version2)).to.be.false();

    version1 = new ServerVersion('7.10-HF44');
    version2 = new ServerVersion('6.0-HF45');
    expect(version1.eq(version2)).to.be.false();

    version1 = new ServerVersion('8.10-HF10');
    expect(version1.eq('8.10-HF11')).to.be.false();
  });

  it('#gt', () => {
    // greater
    let version1 = new ServerVersion('10.1');
    let version2 = new ServerVersion('9.10');
    expect(version1.gt(version2)).to.be.true();

    version1 = new ServerVersion('9.2');
    version2 = new ServerVersion('9.1');
    expect(version1.gt(version2)).to.be.true();

    version1 = new ServerVersion('7.10-HF20');
    version2 = new ServerVersion('7.10');
    expect(version1.gt(version2)).to.be.true();

    version1 = new ServerVersion('6.0-HF44');
    expect(version1.gt('6.0-HF43')).to.be.true();

    // non-greater
    version1 = new ServerVersion('9.10');
    version2 = new ServerVersion('10.1');
    expect(version1.gt(version2)).to.be.false();

    version1 = new ServerVersion('9.1');
    version2 = new ServerVersion('9.2');
    expect(version1.gt(version2)).to.be.false();

    version1 = new ServerVersion('7.10');
    version2 = new ServerVersion('7.10-HF20');
    expect(version1.gt(version2)).to.be.false();

    version1 = new ServerVersion('6.0-HF43');
    expect(version1.gt('6.0-HF44')).to.be.false();
  });

  it('#lt', () => {
    // lesser
    let version1 = new ServerVersion('9.10');
    let version2 = new ServerVersion('10.1');
    expect(version1.lt(version2)).to.be.true();

    version1 = new ServerVersion('9.1');
    version2 = new ServerVersion('9.2');
    expect(version1.lt(version2)).to.be.true();

    version1 = new ServerVersion('7.10');
    version2 = new ServerVersion('7.10-HF20');
    expect(version1.lt(version2)).to.be.true();

    version1 = new ServerVersion('6.0-HF43');
    expect(version1.lt('6.0-HF44')).to.be.true();

    // non-lesser
    version1 = new ServerVersion('10.1');
    version2 = new ServerVersion('9.10');
    expect(version1.lt(version2)).to.be.false();

    version1 = new ServerVersion('9.2');
    version2 = new ServerVersion('9.1');
    expect(version1.lt(version2)).to.be.false();

    version1 = new ServerVersion('7.10-HF20');
    version2 = new ServerVersion('7.10');
    expect(version1.lt(version2)).to.be.false();

    version1 = new ServerVersion('6.0-HF44');
    expect(version1.lt('6.0-HF43')).to.be.false();
  });

  it('#gte', () => {
    // greater or equal
    let version1 = new ServerVersion('9.10');
    let version2 = new ServerVersion('9.10');
    expect(version1.gte(version2)).to.be.true();

    version1 = new ServerVersion('9.10');
    version2 = new ServerVersion('8.10');
    expect(version1.gte(version2)).to.be.true();

    // non-greater or non-equal
    version1 = new ServerVersion('7.10');
    version2 = new ServerVersion('8.10');
    expect(version1.gte(version2)).to.be.false();
  });

  it('#lte', () => {
    // lesser or equal
    let version1 = new ServerVersion('9.10');
    let version2 = new ServerVersion('9.10');
    expect(version1.lte(version2)).to.be.true();

    version1 = new ServerVersion('8.10');
    version2 = new ServerVersion('9.10');
    expect(version1.lte(version2)).to.be.true();

    // non-lesser or non-equal
    version1 = new ServerVersion('9.10');
    version2 = new ServerVersion('8.10');
    expect(version1.lte(version2)).to.be.false();
  });
});
