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

### Overriding verson on drone deploy command

You can override the "verion" property buy passing a "VERSION" parameter to `deploy` command.
`drone deploy owner/repo {BUILD} {ENVIRONMENT} -p VERSION=2.0.0`.


### Using DRONE_TAG/CI_TAG as version

If you omit "version" propperty and do not pass the override version parameter, the plugin will try to use "DRONE_TAG" and "CI_TAG" as version.

```diff
 pipeline:
     deploy:
         image: rwillians/rancher-for-ci
         service: my-stack/my-service
-        version: v1.0.10
         version_prefix: v
         secrets: [ rancher_url, rancher_access_key, rancher_secret_key ]
```

`drone deploy owner/repo {BUILD} {ENVIRONMENT}`

Note that you should use a build resultant of a `tag` event, otherwise there won't be any "DRONE_TAG" or "CI_TAG" which will result in failure.


### All properties

#### service (required)

The service name which will be upgraded, e.g.: **service-name** or **stack-name/service-name**.


#### version (optional)

Version to which you want to upgrade your service, e.g: **v1.0.1**.

This value can also be acquired from the environment variables **VERSION**, **PLUGIN_VERSION**, **DRONE_TAG**, **CI_TAG** and **DRONE_COMMIT_REF**.


#### version_prefix (optional)

Remove the version prefix, e.g.: if set to "v", then a version "v1.0.0" will become "1.0.0".


#### release_variable (required)

Adds an environment variable to Rancher containing the release version, eg: **SENTRY_RELEASE**.


#### commit_variable (required)

Adds an environment variable to Rancher containing the commit reference, eg: **SENTRY_GIT_COMMIT**.


#### log_instructions (optional)

Allow to log instructions sent to rancher (`true` or `false`), which might expose sensitive information.


#### endpoint (optional)

Rancher api url for the environment you want to upgrade, e.g.: **https://rancher.domain.com/v1/**.

This value can also be acquired from the environment variable **RANCHER_URL**.


#### access_key (optional)

Access key for the given Rancher api environment, e.g.: **FF4D832E2045B894577C**.

This value can also be acquired from the environment variable **RANCHER_ACCESS_KEY**.


#### secret_key (optional)

Secret key for the given Rancher api environment, e.g.: **XhwN2HCvYppbQQqgXNurmZLrrjGHhg81s2yETMCi**.

This value can also be acquired from the environment variable **RANCHER_SECRET_KEY**.


### Development

#### Build

```sh
docker build -t rancher-for-ci .
```

#### Run

```sh
docker run -ti \
    -e "PLUGIN_ENDPOINT=$RANCHER_URL" \
    -e "PLUGIN_ACCESS_KEY=$RANCHER_ACCESS_KEY" \
    -e "PLUGIN_SECRET_KEY=$RANCHER_SECRET_KEY" \
    -e PLUGIN_SERVICE=my-stack/my-service \
    -e PLUGIN_VERSION=v1.0.0 \
    -e PLUGIN_VERSION_PREFIX=v \
    -e PLUGIN_RELEASE_VARIABLE=SENTRY_RELEASE \
    -e PLUGIN_COMMIT_VARIABLE=SENTRY_GIT_COMMIT \
    -e DRONE_COMMIT_REF=c0deb10c4 \
    -e PLUGIN_LOG_INSTRUCTIONS=1 \
    rancher-for-ci --dry-run
```
