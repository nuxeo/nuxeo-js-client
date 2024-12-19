/*
 * (C) Copyright 2022-2023 Nuxeo (http://nuxeo.com/) and others.
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
library identifier: "platform-ci-shared-library@v0.0.49"

String getNodeJsVersion(String containerId) {
  container(containerId) {
    return sh(returnStdout: true, script: 'node -v').trim()
  }
}

Closure buildFunctionalTestStage(String containerId, String nodejsVersion, String nuxeoVersion) {
  def nodejsVersionSlug = nodejsVersion.replaceAll('\\..*', '')
  def nuxeoVersionSlug = nuxeoVersion.replaceAll('\\..*', '')
  def testNamespace = "${CURRENT_NAMESPACE}-js-client-ftests-${BRANCH_NAME}-${BUILD_NUMBER}-nuxeo-${nuxeoVersionSlug}-node-${nodejsVersionSlug}".toLowerCase()
  def nuxeoDomain = "nuxeo-${nuxeoVersionSlug}-node-${nodejsVersionSlug}-js-client-${BRANCH_NAME}.platform.dev.nuxeo.com".toLowerCase()

  return {
    container(containerId) {
      nxWithHelmfileDeployment(namespace: testNamespace, environment: "functional-tests-${nuxeoVersion}",
          secrets: [[name: 'platform-cluster-tls', namespace: 'platform'], [name: 'instance-clid-preprod', namespace: 'platform']],
          envVars: ["NUXEO_VERSION=${nuxeoVersion}-${VERSION}", "JS_REPORTS_DIR=nuxeo-${nuxeoVersionSlug}-node-${nodejsVersionSlug}",
            "NUXEO_DOMAIN=${nuxeoDomain}", "NUXEO_BASE_URL=https://${nuxeoDomain}/nuxeo"]) {
        script {
          try {
            sh "yarn it:cover"
          } finally {
            junit testResults: "ftest/target/${JS_REPORTS_DIR}/test-results-node.xml"
          }
        }
      }
    }
  }
}

pipeline {
  agent {
    label 'jenkins-nuxeo-js-client'
  }
  options {
    buildDiscarder(logRotator(daysToKeepStr: '60', numToKeepStr: '60', artifactNumToKeepStr: '5'))
    disableConcurrentBuilds(abortPrevious: true)
    githubProjectProperty(projectUrlStr: 'https://github.com/nuxeo/nuxeo-js-client')
  }
  environment {
    CURRENT_NAMESPACE = nxK8s.getCurrentNamespace()
    NODEJS_ACTIVE_VERSION = getNodeJsVersion('nodejs-active')
    NODEJS_MAINTENANCE_VERSION = getNodeJsVersion('nodejs-maintenance')
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

    stage('Lint project') {
      steps {
        container('nodejs-active') {
          sh 'yarn install'
          // don't fail the build to let tests run, there will be a lint status on the PR
          sh 'yarn run it:checkstyle || true'
        }
      }
      post {
        always {
          recordIssues(publishAllIssues: true, enabledForFailure: true, tool: checkStyle(), 
            qualityGates: [[threshold: 1, type: 'TOTAL', unstable: true]])
        }
      }
    }

    stage('Build project') {
      parallel {
        stage('With Node.js active') {
          environment {
            JS_DIST_DIR = 'dist-nodejs-active'
          }
          steps {
            container('nodejs-active') {
              nxWithGitHubStatus(context: 'yarn/build/nodejs-active', message: "Build with Node.js ${NODEJS_ACTIVE_VERSION}") {
                sh 'yarn run build'
              }
            }
          }
          post {
            always {
              archiveArtifacts artifacts: "${JS_DIST_DIR}/**"
            }
          }
        }
        stage('With Node.js maintenance') {
          environment {
            JS_DIST_DIR = 'dist-nodejs-maintenance'
          }
          steps {
            container('nodejs-maintenance') {
              nxWithGitHubStatus(context: 'yarn/build/nodejs-maintenance', message: "Build with Node.js ${NODEJS_MAINTENANCE_VERSION}") {
                sh 'yarn run build'
              }
            }
          }
          post {
            always {
              archiveArtifacts artifacts: "${JS_DIST_DIR}/**"
            }
          }
        }
      }
    }

    stage('Build functional Docker images') {
      parallel {
        stage('Nuxeo 10.10') {
          steps {
            container('nodejs-active') {
              script {
                // TODO for 10.10 retrieve the last HF version
                nxDocker.build(skaffoldFile: 'ci/docker/nuxeo/skaffold.yaml', envVars: ["FTESTS_VERSION=10.10-${VERSION}", "NUXEO_VERSION=10.10-HF67"])
              }
            }
          }
        }
        stage('Nuxeo 2021') {
          steps {
            container('nodejs-active') {
              script {
                nxDocker.build(skaffoldFile: 'ci/docker/nuxeo/skaffold.yaml', envVars: ["FTESTS_VERSION=2021-${VERSION}", "NUXEO_VERSION=2021"])
              }
            }
          }
        }
        stage('Nuxeo 2023') {
          steps {
            container('nodejs-active') {
              script {
                nxDocker.build(skaffoldFile: 'ci/docker/nuxeo/skaffold.yaml', envVars: ["FTESTS_VERSION=2023-${VERSION}", "NUXEO_VERSION=2023"])
              }
            }
          }
        }
        stage('Nuxeo 2025') {
          steps {
            container('nodejs-active') {
              script {
                nxDocker.build(skaffoldFile: 'ci/docker/nuxeo/skaffold.yaml', envVars: ["FTESTS_VERSION=2025-${VERSION}", "NUXEO_VERSION=2025.x"])
              }
            }
          }
        }
      }
    }

    stage('Run functional tests') {
      steps {
        script {
          def stages = [:]
          // run functional tests against latest and upcoming nuxeo version for active node
          for (nuxeoVersion in ["2023", "2025"]) {
            stages["Against Nuxeo ${nuxeoVersion} - Node.js ${NODEJS_ACTIVE_VERSION}"] =
              buildFunctionalTestStage("nodejs-active", env.NODEJS_ACTIVE_VERSION, nuxeoVersion)
          }
          // run functional tests against all nuxeo version for maintenance mode
          for (nuxeoVersion in ["10.10", "2021", "2023"]) {
            stages["Against Nuxeo ${nuxeoVersion} - Node.js ${NODEJS_MAINTENANCE_VERSION}"] =
              buildFunctionalTestStage("nodejs-maintenance", env.NODEJS_MAINTENANCE_VERSION, nuxeoVersion)
          }
          parallel stages
        }
      }
    }

    stage('Run Browser tests') {
      environment {
        JS_DIST_DIR = 'dist-nodejs-active'
        JS_REPORTS_DIR = 'nuxeo-2023-browser'
      }
      steps {
        container('nodejs-active') {
          script {
            def testNamespace = "${CURRENT_NAMESPACE}-js-client-browser-${BRANCH_NAME}-${BUILD_NUMBER}".toLowerCase()
            def nuxeoDomain = "nuxeo-js-client-${BRANCH_NAME}.platform.dev.nuxeo.com".toLowerCase()

            nxWithHelmfileDeployment(namespace: testNamespace, environment: "functional-tests-2023",
                secrets: [[name: 'platform-cluster-tls', namespace: 'platform']], envVars: ["NUXEO_VERSION=2023-${VERSION}",
                "NUXEO_DOMAIN=${nuxeoDomain}", "NUXEO_BASE_URL=https://${nuxeoDomain}/nuxeo"]) {
              withCredentials([usernamePassword(credentialsId: 'saucelabs-js-client-credentials', usernameVariable: 'SAUCE_USERNAME', 
                  passwordVariable: 'SAUCE_ACCESS_KEY')]) {
                sh 'yarn run it:browser'
              }
            }
          }
        }
      }
      post {
        always {
          junit testResults: "ftest/target/${JS_REPORTS_DIR}/*.xml"
        }
      }
    }

  }

  post {
    always {
      script {
        currentBuild.description = "Build ${VERSION}"
        nxJira.updateIssues()
      }
    }
  }
}
