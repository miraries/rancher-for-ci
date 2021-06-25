#!/usr/bin/env node
'use strict'

/* eslint-disable no-console, require-jsdoc, security/detect-object-injection, security/detect-non-literal-regexp */

const Rancher = require('../index')
const pkg = require('../package.json')

const HEADER = '\n########################################################\n'

process.on('unhandledRejection', (reason, promise) => {
  console.log({ event: 'UnhandledPromiseRejection', promise, reason })
  process.exit(1)
})

const prettyprint = obj => {
  JSON.stringify(obj, null, 2)
    .split('\n')
    .forEach(line => {
      console.log('    ' + line)
    })
}

const flags = {
  values: process.argv.slice(2),
  has (flag) {
    return this.values.includes(flag)
  }
}

const args = {
  service: {
    name: 'service',
    required: true,
    description: 'service name to be upgraded',
    usage: '[stack-name/]service-name',
    value: {
      vars: ['PLUGIN_SERVICE']
    }
  },
  version: {
    name: 'version',
    required: true,
    description: 'version to which you want to upgrade your service',
    usage: '1.0.0',
    value: {
      vars: [
        'VERSION',
        'PLUGIN_VERSION',
        'DRONE_TAG',
        'CI_TAG',
        'DRONE_COMMIT_REF'
      ],
      transform: str => str.replace(/^refs\/tags\//, '')
    }
  },
  versionPrefix: {
    name: 'version_prefix',
    required: false,
    description:
      'remove version prefix (e.g.: if set to "v", then a version "v1.0.0" will become "1.0.0")',
    usage: 'v',
    value: {
      vars: ['PLUGIN_VERSION_PREFIX']
    }
  },
  releaseVariable: {
    name: 'release_variable',
    required: false,
    description:
      'adds an environment variable to Rancher containing the release version',
    usage: 'SENTRY_RELEASE',
    value: {
      vars: ['PLUGIN_RELEASE_VARIABLE'],
      transform: str => str.toUpperCase()
    }
  },
  commitVariable: {
    name: 'commit_variable',
    required: false,
    description:
      'adds an environment variable to Rancher containing the commit reference',
    usage: 'SENTRY_GIT_COMMIT',
    value: {
      vars: ['PLUGIN_COMMIT_VARIABLE'],
      transform: str => str.toUpperCase()
    }
  },
  commit: {
    name: 'commit',
    required: false,
    description: 'gets the commit ref',
    value: {
      vars: ['DRONE_COMMIT', 'CI_COMMIT']
    }
  },
  startFirst: {
    name: 'start_first',
    required: false,
    description: 'use "start before stopping" during upgrade',
    value: {
      vars: ['START_FIRST']
    }
  },
  logInstructions: {
    name: 'log_instructions',
    required: false,
    description:
      'log upgrade instructions sent to rancher, which might expose sensitive information',
    usage: 'true|false',
    value: {
      default: false,
      vars: ['PLUGIN_LOG_INSTRUCTIONS'],
      transform: str => str === 1 || str === '1' || str === 'true'
    }
  },
  rancherUrl: {
    name: 'endpoint',
    required: true,
    description: 'rancher api url for the environment you wish to upgrade',
    usage: 'https://rancher.domain.com/v1/projects/{ID}',
    value: {
      vars: ['PLUGIN_ENDPOINT', 'RANCHER_URL']
    }
  },
  rancherAccessKey: {
    name: 'access_key',
    required: true,
    description: 'access key for the given rancher api environment',
    usage: 'FF4D832E2045B894577C',
    value: {
      vars: ['PLUGIN_ACCESS_KEY', 'RANCHER_ACCESS_KEY']
    }
  },
  rancherSecretKey: {
    name: 'secret_key',
    required: true,
    description: 'secret key for the given rancher api environment',
    usage: 'XhwN2HCvYppbQQqgXNurmZLrrjGHhg81s2yETMCi',
    value: {
      vars: ['PLUGIN_SECRET_KEY', 'RANCHER_SECRET_KEY']
    }
  },
  get (parameter) {
    const { description, name, required, usage, value } = this[parameter]
    const resolvedValue =
      value.vars
        .map(v => process.env[v] || process.env[v.toLowerCase()])
        .filter(v => !!v)
        .shift() || value.default

    if (!resolvedValue && required) {
      console.error(`argument "${name}" is missing`)
      console.error(`    description: ${description}`)
      console.error(`          usage: ${usage}`)
      console.error(`       env vars: ${value.vars.join(', ')}`)
      process.exit(1)
    }

    if (!resolvedValue) {
      return value.default || null
    }

    return value.transform ? value.transform(resolvedValue) : resolvedValue
  }
}

const client = new Rancher({
  url: args.get('rancherUrl'),
  dryRun: flags.has('--dry-run'),
  accessKey: args.get('rancherAccessKey'),
  secretKey: args.get('rancherSecretKey'),
  commitVariable: args.get('commitVariable'),
  releaseVariable: args.get('releaseVariable'),
})

;(async () => {
  console.log(`Running rancher-for-ci v${pkg.version}`)

  const commit = args.get('commit')
  const startFirst = args.get('startFirst') ?? true;
  const service = args.get('service')
  const versionPrefix = args.get('versionPrefix')
  const version = versionPrefix
    ? args.get('version').replace(new RegExp(`^${versionPrefix}`), '')
    : args.get('version')

  console.log(
    'Upgrading service',
    service,
    'to version',
    (versionPrefix ? `[${versionPrefix}]` : '') + version,
    '...'
  )

  try {
    const result = await client.upgrade(service, version, commit, startFirst)
    const {
      upgrade: {
        inServiceStrategy: { launchConfig }
      }
    } = result

    console.log(HEADER)
    console.log(' Upgrade request has been accepted!')
    console.log('      service:', service)
    console.log('     to image:', launchConfig.imageUuid)
    console.log('       commit:', commit)
    console.log(HEADER)

    if (args.get('logInstructions')) {
      console.error('\nService:')
      prettyprint(result.service)
      console.error('\n\nUpgrade instructions:')
      prettyprint(result.upgrade)
      console.error('\n\nRancher response:')
      prettyprint(result.response)
      console.log(HEADER)
    }
  } catch (err) {
    console.log(HEADER)
    console.error('Ops, something went wrong!')
    console.error('               error:', err.message)
    console.error('               stack:', err.stack)
    console.error('.   rancher response:', err.response)
    console.log(HEADER)
    process.exit(1)
  }

  console.log('Done!')
  process.exit(0)
})()

/* eslint-enable no-console, require-jsdoc, security/detect-object-injection, security/detect-non-literal-regexp */
