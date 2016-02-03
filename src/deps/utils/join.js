'use strict';

export default function join(...args) {
  const joined = args.join('/');
  return joined.replace(/(^\/+)|([^:])\/\/+/g, '$2/');
}
