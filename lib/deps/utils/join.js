function _join(first, second) {
  const arr = [
    first.replace(/\/*$/g, ''), // remove all ending '/'
    typeof second === 'string' ? second.replace(/^\/*/g, '') : second, // remove all leading '/'
  ];
  return arr.join('/');
}

function join(...args) {
  return args.slice(1).reduce(_join, args[0]);
}

module.exports = join;
