#!/usr/bin/env node

const fs = require('fs-extra');
const pkg = require('../package.json');

const copyFiles = () => {
  delete pkg.devDependencies;
  delete pkg.scripts;

  fs.writeFileSync('dist/package.json', JSON.stringify(pkg, null, '  '), 'utf-8');
  fs.writeFileSync('dist/LICENSE', fs.readFileSync('LICENSE', 'utf-8'), 'utf-8');
  fs.writeFileSync('dist/README.md', fs.readFileSync('README.md', 'utf-8'), 'utf-8');
};

const copyLib = () => {
  fs.ensureDirSync('dist/lib');
  fs.copySync('lib', 'dist/lib');
};

copyLib();
copyFiles();
