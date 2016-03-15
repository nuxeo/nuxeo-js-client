'use strict';

import extend from 'extend';
import Base from '../base';

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
    this._nuxeo = opts.nuxeo;
    this._directory = opts.directory;
    this.properties = {};
    this._dirtyProperties = {
      id: entry.properties.id,
    };
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
   * @param {object} [opts] - Options overriding the ones from the Document object.
   * @returns {Promise} A promise object resolved with the updated entry.
   */
  save(opts = {}) {
    const options = this._computeOptions(opts);
    return this._directory.update({
      properties: this._dirtyProperties,
    }, options);
  }
}

export default DirectoryEntry;
