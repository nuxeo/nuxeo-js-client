/*
 * (C) Copyright 2022-2025 Nuxeo (http://nuxeo.com/) and others.
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
library identifier: "platform-ci-shared-library@v0.0.71"

String getClidSecret(nuxeoTag) {
  // target connect preprod if nuxeo tag is a build tag or a moving tag
  return nuxeoTag.matches("^\\d+\\.(x|\\d+\\.\\d+)\$") ? 'instance-clid-preprod' : 'instance-clid'
}

String getNodeJsVersion(String containerId) {
  container(containerId) {
    return sh(returnStdout: true, script: 'node -v').trim()
  }
}

Closure buildFunctionalTestStage(String containerId, String nodejsVersion, String nuxeoTag) {
  def nuxeoFullVersion = nxDocker.getLabel(image: "${PRIVATE_DOCKER_REGISTRY}/nuxeo/nuxeo:${nuxeoTag}", label: 'org.nuxeo.version')
  def clidSecret = getClidSecret(nuxeoTag)

  def nodejsVersionSlug = nodejsVersion.replaceAll('\\..*', '')
  def nuxeoTagSlug = nuxeoTag.replaceAll('\\..*', '')
  def testNamespace = "${CURRENT_NAMESPACE}-js-client-ftests-${BRANCH_NAME}-${BUILD_NUMBER}-nuxeo-${nuxeoTagSlug}-node-${nodejsVersionSlug}".toLowerCase()
  def nuxeoDomain = "nuxeo-${nuxeoTagSlug}-node-${nodejsVersionSlug}-js-client-${BRANCH_NAME}.platform.dev.nuxeo.com".toLowerCase()

  if (nuxeoFullVersion.startsWith("2023")) {
    nuxeoFullVersion = "2023.36.0"
  }
  return {
    container(containerId) {
      nxWithHelmfileDeployment(namespace: testNamespace, environment: "functional-tests-${nuxeoTag}",
          secrets: [[name: 'platform-cluster-tls', namespace: 'platform'], [name: clidSecret, namespace: 'platform']],
          envVars: [
            "CONNECT_CLID_SECRET=${clidSecret}", 
            "NUXEO_VERSION=${nuxeoFullVersion}",
            "VERSION=${nuxeoTag}-${VERSION}", 
            "JS_REPORTS_DIR=nuxeo-${nuxeoTagSlug}-node-${nodejsVersionSlug}",
            "NUXEO_DOMAIN=${nuxeoDomain}", 
            "NUXEO_BASE_URL=https://${nuxeoDomain}/nuxeo",
          ]) {
        script {
          try {
            sh "npm run it:cover"
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
          sh 'npm install'
          // don't fail the build to let tests run, there will be a lint status on the PR
          sh 'npm run it:checkstyle || true'
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
              nxWithGitHubStatus(context: 'npm/build/nodejs-active', message: "Build with Node.js ${NODEJS_ACTIVE_VERSION}") {
                sh 'npm run build'
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
              nxWithGitHubStatus(context: 'npm/build/nodejs-maintenance', message: "Build with Node.js ${NODEJS_MAINTENANCE_VERSION}") {
                sh 'npm run build'
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
                nxDocker.build(skaffoldFile: 'ci/docker/nuxeo/skaffold.yaml', envVars: ["FTESTS_VERSION=2025-${VERSION}", "NUXEO_VERSION=2025"])
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
          for (nuxeoTag in ["2025"]) {
            stages["Against Nuxeo ${nuxeoTag} - Node.js ${NODEJS_ACTIVE_VERSION}"] =
              buildFunctionalTestStage("nodejs-active", env.NODEJS_ACTIVE_VERSION, nuxeoTag)
          }
          // run functional tests against all nuxeo version for maintenance mode
          for (nuxeoTag in ["2023", "2025"]) {
            stages["Against Nuxeo ${nuxeoTag} - Node.js ${NODEJS_MAINTENANCE_VERSION}"] =
              buildFunctionalTestStage("nodejs-maintenance", env.NODEJS_MAINTENANCE_VERSION, nuxeoTag)
          }
          parallel stages
        }
      }
    }

    stage('Run Browser tests') {
      environment {
        JS_DIST_DIR = 'dist-nodejs-active'
        JS_REPORTS_DIR = 'nuxeo-2025-browser'
      }
      steps {
        container('nodejs-active') {
          script {
            def nuxeoFullVersion = nxDocker.getLabel(image: "${PRIVATE_DOCKER_REGISTRY}/nuxeo/nuxeo:2025", label: 'org.nuxeo.version')

            def testNamespace = "${CURRENT_NAMESPACE}-js-client-browser-${BRANCH_NAME}-${BUILD_NUMBER}".toLowerCase()
            def nuxeoDomain = "nuxeo-js-client-${BRANCH_NAME}.platform.dev.nuxeo.com".toLowerCase()

            nxWithHelmfileDeployment(namespace: testNamespace, environment: "functional-tests-2025",
                secrets: [[name: 'platform-cluster-tls', namespace: 'platform'], [name: 'instance-clid', namespace: 'platform']],
                envVars: [
                  "VERSION=2025-${VERSION}",
                  "NUXEO_VERSION=${nuxeoFullVersion}",
                  "NUXEO_DOMAIN=${nuxeoDomain}", 
                  "NUXEO_BASE_URL=https://${nuxeoDomain}/nuxeo",
                ]) {
              withCredentials([usernamePassword(credentialsId: 'saucelabs-js-client-credentials', usernameVariable: 'SAUCE_USERNAME', 
                  passwordVariable: 'SAUCE_ACCESS_KEY')]) {
                sh 'npm run it:browser'
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
        nxUtils.setBuildDescription()
        nxJira.updateIssues()
        nxUtils.notifyBuildStatusIfNecessary()
      }
    }
  }
}
