ARG NUXEO_VERSION=2023

FROM docker-private.packages.nuxeo.com/nuxeo/nuxeo:${NUXEO_VERSION}

RUN mkdir -p ${NUXEO_HOME}/nxserver/config
COPY ftest/src/test/resources/nuxeo-js-*.xml ${NUXEO_HOME}/nxserver/config/
