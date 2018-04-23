/*
 * (C) Copyright 2017 Nuxeo (http://nuxeo.com/) and others.
 *
 * Contributors:
 *     Thomas Roger <troger@nuxeo.com>
 */

 properties([
    [$class: 'BuildDiscarderProperty', strategy: [$class: 'LogRotator', daysToKeepStr: '60', numToKeepStr: '60', artifactNumToKeepStr: '1']],
    disableConcurrentBuilds(),
    [$class: 'RebuildSettings', autoRebuild: false, rebuildDisabled: false],
    pipelineTriggers([
        triggers: [
            [
                $class: 'ReverseBuildTrigger',
                upstreamProjects: "${env.UPSTREAM_PROJECT}", threshold: hudson.model.Result.SUCCESS
            ]
        ]
    ])
 ])

 def REPO_URL = 'https://github.com/nuxeo/nuxeo-js-client'

node(env.SLAVE) {
    try {
        timestamps {
            timeout(30) {
                def commitSha = stage('checkout') {
                    // manually clean node_modules folder
                    sh "rm -rf node_modules"

                    checkout scm
                    return sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                }

                stage('rebase') {
                    setBuildStatus('Building on Nuxeo CI', 'PENDING', "${env.STATUS_CONTEXT_NAME}", REPO_URL, commitSha, "${BUILD_URL}")
                    sh 'git rebase origin/master'
                }

                stage ('build and test') {
                    def jdk = tool name: 'java-8-oracle'
                    env.JAVA_HOME = "${jdk}"
                    def mvnHome = tool name: 'maven-3.3', type: 'hudson.tasks.Maven$MavenInstallation'
                    sh "${mvnHome}/bin/mvn clean verify -f ${env.POM_PATH}"
                    sh "${mvnHome}/bin/mvn verify -f ${env.POM_PATH} -Pes5"
                }

                stage ('post build') {
                    step([$class: 'WarningsPublisher', canComputeNew: false, canResolveRelativePaths: false,
                        consoleParsers: [[parserName: 'Maven']], defaultEncoding: '', excludePattern: '',
                        healthy: '', includePattern: '', messagesPattern: '', unHealthy: ''])
                    archive 'ftest/target/tomcat/log/*.log, ftest/target/js-reports/*.xml, ftest/target/js-reports-es5/*.xml'
                    // TODO cobertura coverage
                    junit 'ftest/target/js-reports/*.xml, ftest/target/js-reports-es5/*.xml'
                    if (env.BRANCH_NAME == 'master') {
                        step([$class: 'JiraIssueUpdater', issueSelector: [$class: 'DefaultIssueSelector'], scm: scm])
                    }
                    if(currentBuild.getPreviousBuild() != null && 'SUCCESS' != currentBuild.getPreviousBuild().getResult()) {
                        mail (to: 'ecm@lists.nuxeo.com', subject: "${env.JOB_NAME} (${env.BUILD_NUMBER}) - Back to normal",
                            body: "Build back to normal: ${env.BUILD_URL}.")
                    }
                    setBuildStatus('Successfully built on Nuxeo CI', 'SUCCESS', "${env.STATUS_CONTEXT_NAME}", REPO_URL, commitSha, "${BUILD_URL}")
                }

            }
        }
    } catch(e) {
        currentBuild.result = "FAILURE"
        step([$class: 'ClaimPublisher'])
        archive 'ftest/target/tomcat/log/*.log, ftest/target/js-reports/*.xml, ftest/target/js-reports-es5/*.xml'
        mail (to: 'ecm@lists.nuxeo.com', subject: "${env.JOB_NAME} (${env.BUILD_NUMBER}) - Failure!",
            body: "Build failed ${env.BUILD_URL}.")
        setBuildStatus('Failed to build on Nuxeo CI', 'FAILURE', "${env.STATUS_CONTEXT_NAME}", REPO_URL, commitSha, "${BUILD_URL}")
        throw e
    } finally {
        step([$class: 'CheckStylePublisher', canComputeNew: false, defaultEncoding: '', healthy: '',
            pattern: 'ftest/target/checkstyle-result.xml', unHealthy: ''])
    }
}
