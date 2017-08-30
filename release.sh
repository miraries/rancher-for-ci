#!/usr/bin/env sh

set -ex

docker build -t rwillians/rancher-for-ci:latest .
docker push rwillians/rancher-for-ci:latest
docker build -t rwillians/rancher-for-ci:$(node -e "console.log(require('./package.json').version)") .
docker push rwillians/rancher-for-ci:$(node -e "console.log(require('./package.json').version)")

npm publish
