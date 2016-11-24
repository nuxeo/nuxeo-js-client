'use strict';

function join(...args) {
  const joined = args.join('/');
  return joined.replace(/(^\/+)|([^:])\/\/+/g, '$2/');
}

module.exports = join;
