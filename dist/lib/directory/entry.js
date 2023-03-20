const extend = require('extend');
const Base = require('../base');

const { LTS_2017 } = require('../server-version');

/**
 * The `DirectoryEntry` class wraps a directory entry.
 *
 * **Cannot directly be instantiated**
 */
class DirectoryEntry extends Base {
  /**
   * Creates a DirectoryEntry.
   * @param {object} entry - The initial entry object.
   *                         This DirectoryEntry object will be extended with entry properties.
   * @param {object} opts - The configuration options.
   * @param {string} opts.directory - The {@link Directory} object linked to this entry.
   */
  constructor(entry, opts) {
    super(opts);
    // make sure we have a Directory object for this entry
    // opts.directory may be empty if the entry was not instantiated from a Directory object
    this._directory = opts.directory || opts.nuxeo.directory(entry.directoryName);
    this.properties = {};
    this._dirtyProperties = {};
    const { serverVersion } = this._directory._nuxeo;
    // compatibility code for 8.10 (or unknown version) - make all properties dirty so that
    // the `idField` will be passed when updating
    if (!serverVersion || serverVersion.lt(LTS_2017)) {
      this._dirtyProperties = extend({}, entry.properties);
    }
    extend(true, this, entry);
  }

  /**
   * Sets entry properties.
   * @param {object} properties - The properties to set.
   * @returns {DirectoryEntry}
   *
   * @example
   * entry.set({
   *   'label': 'new label',
   *   'ordering': 50,
   * });
   */
  set(properties) {
    this._dirtyProperties = extend(true, {}, this._dirtyProperties, properties);
    return this;
  }

  /**
   * Gets an entry property.
   * @param {string} propertyName - The property name, such as 'label', 'ordering', ...
   * @returns {DirectoryEntry}
   */
  get(propertyName) {
    return this._dirtyProperties[propertyName] || this.properties[propertyName];
  }

  /**
   * Saves the entry. It updates only the 'dirty properties' set through the {@link DirectoryEntry#set} method.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the updated entry.
   */
  save(opts = {}) {
    const options = this._computeOptions(opts);
    return this._directory.update({
      id: this.id,
      properties: this._dirtyProperties,
    }, options);
  }
}

module.exports = DirectoryEntry;
