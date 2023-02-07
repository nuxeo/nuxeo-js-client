function join(...args) {
  let joined = args[0];
  for (let i = 1; i < args.length; i += 1) {
    if (!joined.endsWith('/') && (typeof args[i] !== 'string' || !args[i].startsWith('/'))) {
      joined += '/';
    }
    joined += args[i];
  }
  return joined;
}

module.exports = join;
