# Rancher for CI

Because I needed a plugin that could upgrade only a given service's docker image version.

**Attention**: This pluging supports only Rancher Environment API v1.


## Parameters

- **endpoint**: the environment API endpoint
- **access key**: a valid environment API access key
- **secret key**: a valid environment API secret key
- **service**: the services which you want to upgrade
- **version**: the version to which you want to upgrade


## Using as a node module

Install it (`yarn add rancher-for-ci` or `npm i -s rancher-for-ci`) then use as in the example below:

```js
const Rancher = require('rancher-for-ci')

const client = new Rancher(
  'https://rancher.domain.com/v1/projects/{ID}',
  'MyAccessKey',
  'MySecretKey'
)

;(async () => {
    await client.upgrade('my-stack/my-service', '1.0.0')
})()
```


## Using as a Drone CI plugin

```yml
pipeline:
    deploy:
        image: rwillians/rancher-for-ci
        service: my-stack/my-service
        version: latest
        secrets: [ rancher_url, rancher_access_key, rancher_secret_key ]
```

```diff
 pipeline:
     deploy:
         image: rwillians/rancher-for-ci
         service: my-stack/my-service
-        version: latest
+        version: v1.0.10
+        version_prefix: v
         secrets: [ rancher_url, rancher_access_key, rancher_secret_key ]
```

```yml
pipeline:
    deploy:
        image: rwillians/rancher-for-ci
        endpoint: https://rancher.domain.com/v1/projects/{ID}
        access_key: MyAccessKey
        secret_key: MySecretKey
        service: my-stack/my-service
        version: 2.0.1-rc.1

```

### Development

#### Build

```sh
docker build -t rancher-for-ci .
```

#### Run

```sh
docker run -ti \
    -e PLUGIN_ENDPOINT="https://rancher.domain.com/v1/projects/{ID}" \
    -e PLUGIN_ACCESS_KEY="ReplaceMe!" \
    -e PLUGIN_SECRET_KEY="ReplaceMe!" \
    -e PLUGIN_SERVICE="my-stack/my-service" \
    -e PLUGIN_VERSION="1.0.0" \
    rancher-for-ci
```
