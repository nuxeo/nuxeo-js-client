#!/bin/bash -
set -e

git checkout -f stable
git merge origin/master -s recursive -X theirs --no-edit
git add -f dist lib
git commit -m "Update stable branch\n $JOB_NAME#$BUILD_NUMBER"
git push origin stable:stable
