#!/usr/bin/env node

const fs = require('fs-extra');
const pkg = require('../package.json');
const distDir = process.env.JS_DIST_DIR || 'dist'

const copyFiles = () => {
  delete pkg.devDependencies;
  delete pkg.scripts;

  fs.writeFileSync(`${distDir}/package.json`, JSON.stringify(pkg, null, '  '), 'utf-8');
  fs.writeFileSync(`${distDir}/LICENSE`, fs.readFileSync('LICENSE', 'utf-8'), 'utf-8');
  fs.writeFileSync(`${distDir}/README.md`, fs.readFileSync('README.md', 'utf-8'), 'utf-8');
};

const copyLib = () => {
  fs.ensureDirSync(`${distDir}/lib`);
  fs.copySync('lib', `${distDir}/lib`);
};

copyLib();
copyFiles();
