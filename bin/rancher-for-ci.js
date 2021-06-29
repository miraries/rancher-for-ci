#!/usr/bin/env node
'use strict'

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import path from 'path'
import Rancher from '../index.js'

import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pkg = require('../package.json')

const argv = yargs(hideBin(process.argv))
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
  .strict()
  .help()
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

  console.log('Done!')
  process.exit(0)
})()
