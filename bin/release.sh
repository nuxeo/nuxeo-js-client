#!/bin/bash -

set -e

VERSION=$1
if [ -z "$VERSION" ]; then
  echo 'Usage: ./release.sh VERSION'
  exit 1
fi

git checkout master

# Update the version in package.json
npm version $VERSION --git-tag-version=false
git add package.json
git ci -m "Update version to $VERSION"

# branch to do the actual build
git checkout -b release

# make sure dependencies are up to date
NODE_MODULES=node_modules
if [ -d "$NODE_MODULES" ]; then
  rm -r $NODE_MODULES
fi
npm install

# build, test and publish
gulp prepublish
npm publish

# freeze dependencies versions
npm shrinkwrap --dev

# update README links to point to the released doc
sed -i.bak "s|nuxeo-js-client/latest|nuxeo-js-client/$VERSION|g" README.md
rm README.md.bak

git add -f dist lib
git add npm-shrinkwrap.json
git add README.md
git commit -m "Release $VERSION"
git tag v$VERSION

# generate doc for this release
npm run doc
cp -r doc /tmp/nuxeo.js-doc
git checkout gh-pages
# copy doc for the released version
cp -r /tmp/nuxeo.js-doc $VERSION
# copy doc for the latest version
rm -rf latest
cp -r /tmp/nuxeo.js-doc latest

git add $VERSION
git add latest
git add index.html
git commit -m "Add documentation for release $VERSION"

# cleanup
git checkout master
git branch -D release
rm -r /tmp/nuxeo.js-doc

# push everything
git push origin master
git push origin v$VERSION
git push origin gh-pages
