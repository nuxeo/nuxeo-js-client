ARG NUXEO_VERSION=2021

FROM docker-private.packages.nuxeo.com/nuxeo/nuxeo:${NUXEO_VERSION}

COPY ftest/src/test/resources/log4j2.xml ${NUXEO_HOME}/lib/log4j2.xml

RUN mkdir -p ${NUXEO_HOME}/nxserver/config
COPY ftest/src/test/resources/nuxeo-js-*.xml ${NUXEO_HOME}/nxserver/config/
