const SERVER_VERSION_PATTERN = /(\d+)\.(\d+)(?:-HF(\d+))?/;

/**
 * The `ServerVersion` class represents a Nuxeo Server version.
 *
 * It handles major, minor and hotfix version.
 *
 * Limitations:
 *   - Ignore the `-SNAPSHOT` and `-IXXXXXXXX_XXXX` suffixes when parsing the server version
 *   - '9.10-SNAPSHOT' is considered equals to '9.10'
 *   - '9.10-20180101_1212' is considered equals to '9.10'
 */
class ServerVersion {
  constructor(version) {
    const match = version.match(SERVER_VERSION_PATTERN);
    if (!match) {
      throw new Error(`Unknown Nuxeo Server version: ${version}`);
    }

    this.major = parseInt(match[1], 10);
    this.minor = parseInt(match[2], 10);
    this.hotfix = parseInt(match[3], 10) || -1;
    this.version = version;
  }

  static create(version) { return typeof version === 'string' ? new ServerVersion(version) : version; }

  /**
   * Returns whether this version is equal to the `version` param.
   *
   * @param {string|ServerVersion} version - The other version.
   */
  eq(version) {
    const other = ServerVersion.create(version);
    return this.major === other.major && this.minor === other.minor && this.hotfix === other.hotfix;
  }

  /**
   * Returns whether this version is greater than the `version` param.
   *
   * @param {string|ServerVersion} version - The other version.
   */
  gt(version) {
    const other = ServerVersion.create(version);
    return this.major > other.major || (this.major === other.major && this.minor > other.minor)
      || (this.major === other.major && this.minor === other.minor && this.hotfix > other.hotfix);
  }

  /**
   * Returns whether this version is lesser than the `version` param.
   *
   * @param {string|ServerVersion} version - The other version.
   */
  lt(version) {
    const other = ServerVersion.create(version);
    return this.major < other.major || (this.major === other.major && this.minor < other.minor)
      || (this.major === other.major && this.minor === other.minor && this.hotfix < other.hotfix);
  }

  /**
   * Returns whether this version is greater than or equal to the `version` param.
   *
   * @param {string|ServerVersion} version - The other version.
   */
  gte(version) {
    const other = ServerVersion.create(version);
    return this.eq(other) || this.gt(other);
  }

  /**
   * Returns whether this version is lesser than or equal to the `version` param.
   *
   * @param {string|ServerVersion} version - The other version.
   */
  lte(version) {
    const other = ServerVersion.create(version);
    return this.eq(other) || this.lt(other);
  }

  toString() {
    return this.version;
  }
}

const LTS_2016 = new ServerVersion('8.10');
const LTS_2017 = new ServerVersion('9.10');
const LTS_2019 = new ServerVersion('10.10');

ServerVersion.LTS_2016 = LTS_2016;
ServerVersion.LTS_2017 = LTS_2017;
ServerVersion.LTS_2019 = LTS_2019;
ServerVersion.SERVER_VERSIONS = { LTS_2016, LTS_2017, LTS_2019 };

module.exports = ServerVersion;
