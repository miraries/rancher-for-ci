#!/usr/bin/env node
'use strict'

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import path from 'path'
import Rancher from '../rancher/index.js'
import clearCfCache from '../cloudflare/index.js'

import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pkg = require('../package.json')

const argv = yargs(hideBin(process.argv))
  .env('RANCHER')
  .strict()
  .help()
  .option('url', {
    describe: 'Rancher url containing environment id',
    demandOption: true
  })
  .option('accessKey', {
    describe: 'Rancher access key',
    demandOption: true
  })
  .option('secretKey', {
    describe: 'Rancher secret key',
    demandOption: true
  })
  .option('stack', {
    describe: 'Rancher stack name',
    demandOption: true
  })
  .option('service', {
    describe: 'Rancher service name in stack',
    demandOption: true
  })
  .option('tag', {
    describe: 'Version/tag to upgrade service to'
  })
  .option('versionFromPackage', {
    describe: 'Take version from package.json in current dir',
    type: 'boolean',
    default: false
  })
  .option('versionPrefix', {
    describe: 'Remove version prefix during upgrade'
  })
  .option('dry', {
    describe: 'Run process without actually committing any changes/upgrades',
    type: 'boolean',
    default: false
  })
  .option('startFirst', {
    describe: 'Use "start before stopping" during Rancher upgrade',
    type: 'boolean',
    default: true
  })
  .option('cfZoneId', {
    describe: 'Cloudflare zone id to clear cache for',
    type: 'string',
  })
  .option('cfApiKey', {
    describe: 'Cloudflare api key',
    type: 'string',
  })
  .option('verbose', {
    describe: 'Log upgrade instructions sent to rancher, might expose sensitive information',
    type: 'boolean'
  })
  .check(argv => {
    if (!argv.tag && !argv.versionFromPackage) {
      throw new Error('Version/tag must be provided or taken from package.json using versionFromPackage.')
    }

    return true
  })
  .argv

const HEADER = '\n########################################################\n'

process.on('unhandledRejection', (reason, promise) => {
  console.log({ event: 'UnhandledPromiseRejection', promise, reason })
  process.exit(1)
})

const prettyprint = obj => {
  JSON.stringify(obj, null, 2)
    .split('\n')
    .forEach(line => console.log('    ' + line))
}

const client = new Rancher({
  url: argv.url,
  dryRun: argv.dry,
  accessKey: argv.accessKey,
  secretKey: argv.secretKey
})

;(async () => {
  console.log(`Running rancher-for-ci v${pkg.version}`)

  const startFirst = argv.startFirst
  const service = `${argv.stack}/${argv.service}`
  const versionPrefix = argv.versionPrefix

  const providedVersion = argv.tag
    ? argv.tag
    : require(path.join(process.cwd(), 'package.json')).version

  const version = versionPrefix
    ? providedVersion.replace(new RegExp(`^${versionPrefix}`), '')
    : providedVersion

  console.log(
    'Upgrading service',
    service,
    'to version',
    (versionPrefix ? `[${versionPrefix}]` : '') + version,
    '...'
  )

  try {
    const result = await client.upgrade(service, version, null, startFirst)
    const launchConfig = result.upgrade.inServiceStrategy.launchConfig

    console.log(HEADER)
    console.log(' Upgrade request has been accepted!')
    console.log('      service:', service)
    console.log('     to image:', launchConfig.imageUuid)
    console.log(HEADER)

    if (argv.verbose) {
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

  if (argv.cfZoneId && argv.cfApiKey) {
    try {
      await clearCfCache({
        apiKey: argv.cfApiKey,
        zoneId: argv.cfZoneId,
      });

      console.log('Cleared CF cache for zone id', argv.cfZoneId);
    } catch (err) {
      console.log('Error clearing CF cache', err);
    }
  } else {
    console.log('No CF zone or api key provided, no cache to clear');
  }
  console.log(HEADER)

  console.log('Done!')
  process.exit(0)
})()
