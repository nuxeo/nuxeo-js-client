#!/bin/bash -

set -e

BRANCH=$1
VERSION=$2
if [ -z "$VERSION" ]; then
  echo 'Usage: ./release.sh BRANCH VERSION'
  exit 1
fi

git checkout $BRANCH

# Update the version in package.json
yarn version --new-version $VERSION --no-git-tag-version
git add package.json
git commit -m "Update version to $VERSION"

# branch to do the actual build
git checkout -B tmp

# make sure dependencies are up to date
NODE_MODULES=node_modules
if [ -d "$NODE_MODULES" ]; then
  rm -r $NODE_MODULES
fi
yarn

# build
yarn build

# update README links to point to the released doc
sed -i.bak "s|nuxeo-js-client/latest|nuxeo-js-client/$VERSION|g" README.md
rm README.md.bak

git add -f dist lib
git add README.md
git commit -m "Release $VERSION"
git tag v$VERSION

git push origin $BRANCH
git push origin v$VERSION

(cd dist && yarn publish --non-interactive)

# cleanup
git checkout master
git branch -D tmp
