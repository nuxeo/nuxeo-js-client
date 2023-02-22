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
library identifier: "platform-ci-shared-library@v0.0.18"

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
    VERSION = nxUtils.getVersion()
  }
  stages {

    stage('Set labels') {
      steps {
        container('nodejs-active') {
          script {
            nxK8s.setPodLabel()
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
      when {
        expression { !nxUtils.isDryRun() }
      }
      steps {
        container('nodejs-active') {
          sh "./bin/doc.sh ${VERSION}"
        }
      }
      post {
        always {
          archiveArtifacts artifacts: '${VERSION}'
        }
      }
    }

    stage('Bump branch') {
      steps {
        container('nodejs-active') {
          script {
            sh 'git checkout ${BRANCH_NAME}'
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
