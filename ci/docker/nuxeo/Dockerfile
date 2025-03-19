ARG NUXEO_VERSION=2023

FROM docker-private.packages.nuxeo.com/nuxeo/nuxeo:${NUXEO_VERSION}

COPY --chown=900:0 --chmod=775 ci/docker/nuxeo/templates ${NUXEO_HOME}/templates/
