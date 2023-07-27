/*
 * (C) Copyright 2023 Nuxeo (http://nuxeo.com/) and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Contributors:
 *     Kevin Leturc <kevin.leturc@hyland.com>
 */
import java.time.LocalDate
import java.time.format.DateTimeFormatter

library identifier: "platform-ci-shared-library@v0.0.25"

pipeline {
  agent {
    label 'jenkins-nuxeo-js-client'
  }
  options {
    buildDiscarder(logRotator(daysToKeepStr: '60', numToKeepStr: '60', artifactNumToKeepStr: '5'))
    disableConcurrentBuilds()
    githubProjectProperty(projectUrlStr: 'https://github.com/nuxeo/nuxeo-js-client')
  }
  environment {
    JIRA_NXJS_MOVING_VERSION = 'next'
    VERSION = nxUtils.getVersion()
  }
  stages {

    stage('Set labels') {
      steps {
        container('nodejs-active') {
          script {
            nxK8s.setPodLabels()
          }
        }
      }
    }

    stage('Release') {
      steps {
        container('nodejs-active') {
          script {
            sh "git checkout -b release-${VERSION}"
            // update README links to point to the released doc
            sh "sed -i 's|nuxeo-js-client/latest|nuxeo-js-client/${VERSION}|g' README.md"
            sh 'yarn --frozen-lockfile'
            sh 'yarn build'
            // force add updated files (dist is ignored)
            sh 'git add -f dist'
            nxGit.commitTagPush()
          }
        }
      }
      post {
        always {
          archiveArtifacts artifacts: 'dist/**'
        }
      }
    }

    stage('Publish NPM package') {
      when {
        expression { !nxUtils.isDryRun() }
      }
      steps {
        container('nodejs-active') {
          dir('dist') {
            sh "git checkout v${VERSION}"
            withCredentials([file(credentialsId: 'npmjs-npmrc', variable: 'npm_config_userconfig')]) {
              sh 'yarn publish --non-interactive'
            }
          }
        }
      }
    }

    stage('Generate documentation') {
      steps {
        container('nodejs-active') {
          script {
            sh "git checkout v${VERSION}"
            sh 'yarn run doc'
            sh 'mv doc /tmp/nuxeo.js-doc'
            // configure git to fetch other branches than the current one
            sh 'git config --add remote.origin.fetch +refs/heads/gh-pages:refs/remotes/origin/gh-pages'
            nxGit.fetch(reference: 'gh-pages')
            sh 'git checkout gh-pages'
            // move doc for the released version
            sh "mv /tmp/nuxeo.js-doc ${VERSION}"
            // copy doc for the latest version
            sh 'rm -rf latest'
            sh "cp -r ${VERSION} latest"
            nxGit.commitPush(message: "Add documentation for release ${VERSION}", branch: 'gh-pages')
          }
        }
      }
      post {
        always {
          archiveArtifacts artifacts: "${VERSION}/**"
        }
      }
    }

    stage('Release Jira version') {
      steps {
        container('nodejs-active') {
          script {
            def jiraVersionName = "${VERSION}"
            // create a new released version in Jira
            def jiraVersion = [
                project: 'NXJS',
                name: jiraVersionName,
                releaseDate: LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE),
                released: true,
            ]
            nxJira.newVersion(version: jiraVersion)
            // find Jira tickets included in this release and update them
            def jiraTickets = nxJira.jqlSearch(jql: "project = NXJS and fixVersion = '${JIRA_NXJS_MOVING_VERSION}'")
            def previousVersion = sh(returnStdout: true, script: "perl -pe 's/\\b(\\d+)(?=\\D*\$)/\$1-1/e' <<< ${VERSION}").trim()
            def changelog = nxGit.getChangeLog(previousVersion: previousVersion, version: env.VERSION)
            def committedIssues = jiraTickets.data.issues.findAll { changelog.contains(it.key) }
            committedIssues.each {
              nxJira.editIssueFixVersion(idOrKey: it.key, fixVersionToRemove: env.JIRA_NXJS_MOVING_VERSION, fixVersionToAdd: jiraVersionName)
            }
          }
        }
      }
    }

    stage('Bump branch') {
      steps {
        container('nodejs-active') {
          script {
            sh "git checkout ${BRANCH_NAME}"
            sh "yarn version --no-git-tag-version --patch"
            nxGit.commitPush(message: "Post release ${VERSION}")
          }
        }
      }
    }

  }

  post {
    success {
      script {
        currentBuild.description = "Release ${VERSION}"
        nxSlack.success(message: "Successfully released nuxeo/nuxeo-js-client ${VERSION}: ${BUILD_URL}")
      }
    }
    unsuccessful {
      script {
        nxSlack.error(message: "Failed to release nuxeo/nuxeo-js-client ${VERSION}: ${BUILD_URL}")
      }
    }
  }
}
