FROM node:8.4-alpine

LABEL maintainer "Rafael Willians <me@rwillians.com>"

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json yarn.lock .yarnclean /tmp/
RUN cd /tmp \
    && time yarn \
        --link-duplicates \
        --no-emoji \
        --pure-lockfile \
    && yarn cache clean
COPY . /usr/src/app
RUN mv -f /tmp/node_modules /usr/src/app

ENTRYPOINT [ "bin/rancher-for-ci" ]
