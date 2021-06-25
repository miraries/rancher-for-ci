'use strict'

const axios = require('axios')
const merge = require('lodash.merge')
const pWhilst = require('p-whilst')

/**
 * @typedef {import('.').Validate} Validate
 * @typedef {import('.').ErrorCode} ErrorCode
 * @typedef {import('.').Service} Service
 * @typedef {import('.').Stack} Stack
 * @typedef {import('.').ServiceUpgrade} ServiceUpgrade
 * @typedef {import('.').Upgrade} Upgrade
 * @typedef {import('.').Options} Options
 * @typedef {import('axios').AxiosInstance} AxiosInstance
 */

/**
 * @param {AxiosInstance} client -
 * @returns {Promise<Validate>} -
 * @example
 * const { isValid, errorCode } = validate(client)
 */
const validate = async client => {
  try {
    await client.get('/')
    return { isValid: true, errorCode: null }
  } catch (err) {
    /** @type {ErrorCode} */
    let errorCode = 'UNKNOWN'
    if (err.response) {
      if (err.response.status === 404) {
        errorCode = 'NOT_FOUND_ENVIRONMENT'
      } else if (err.response.status === 401) {
        errorCode = 'UNAUTHORIZED'
      }
    }
    return { isValid: false, errorCode }
  }
}

/**
 * @param {AxiosInstance} client -
 * @returns {Promise<Array<Stack>>} -
 * @example
 * const stacks = getStacks(client)
 */
const getStacks = async client => {
  return (await client.get('environments/')).data.data
}

/**
 * @param {AxiosInstance} client -
 * @returns {Promise<Array<Service>>} -
 * @example
 * const services = getServices(client)
 */
const getServices = async client => {
  return (await client.get('services/')).data.data
}

/**
 * @param {Array<Stack>} stacks -
 * @param {string} name -
 * @returns {Stack} -
 * @example
 * const stack = fetchStackByName(stacks, 'MyStack')
 */
const fetchStackByName = (stacks, name) => {
  return stacks.filter(stack => stack.name === name).pop()
}

/**
 * @param {Array<Service>} services -
 * @param {string} name -
 * @param {string} [stackId=null] -
 * @returns {Service} -
 * @example
 * const service = fetchServiceByName(services, 'MyService')
 */
const fetchServiceByName = (services, name, stackId = null) => {
  return services
    .filter(s => s.name === name)
    .filter(s => !stackId || s.environmentId === stackId)
    .pop()
}

/**
 * @param {AxiosInstance} client -
 * @param {string} name -
 * @returns {Promise<Stack>} -
 * @example
 * const stack = findStackByName(client, 'MyStack')
 */
const findStackByName = async (client, name) => {
  const stacks = await getStacks(client)
  const stack = await fetchStackByName(stacks, name)

  if (!stack) {
    throw new Error(`Unable to locate stack '${name}'`)
  }

  return stack
}

/**
 * @param {AxiosInstance} client -
 * @param {string} name -
 * @returns {Promise<Service>} -
 * @example
 * const service = findServiceByName(client, 'MyStack/MyService')
 */
const findServiceByName = async (client, name) => {
  const [service, stack] = name
    .toLowerCase()
    .split('/')
    .reverse()
  const services = await getServices(client)

  const stackId = stack ? (await findStackByName(client, stack)).id : null
  const locatedService = await fetchServiceByName(services, service, stackId)

  if (!locatedService) {
    throw new Error(`Unable to locate service '${service}'`)
  }

  return locatedService
}

/**
 * @param {Service} service -
 * @param {string} newVersion -
 * @param {boolean} [startFirst=true] -
 * @returns {ServiceUpgrade} -
 * @example
 * const upgrade = await buildUpgradeInstructions(service, '1.0.0')
 */
const buildUpgradeInstructions = (service, newVersion, startFirst = true) => {
  const {
    launchConfig,
    launchConfig: { imageUuid }
  } = service

  const [type, repo] = imageUuid.split(':')
  const image = [type, repo, newVersion].join(':')

  return merge(
    { inServiceStrategy: { launchConfig } },
    {
      inServiceStrategy: {
        launchConfig: { imageUuid: image },
        startFirst
      }
    }
  )
}

/**
 * @param {ServiceUpgrade} instruction -
 * @param {string} variable -
 * @param {string} value -
 * @returns {ServiceUpgrade} -
 * @example
 * upgrade = withAdditionalEnvVar(upgrade, 'MY_VAR', 'myValue')
 */
const withAdditionalEnvVar = (instruction, variable, value) => {
  const launchConfig = { environment: { [variable]: value } }

  return merge(instruction, { inServiceStrategy: { launchConfig } })
}

/**
 * @param {AxiosInstance} client -
 * @param {string} id -
 * @param {ServiceUpgrade} upgrade -
 * @returns {Promise<*>} -
 * @example
 * const response = upgradeService(client, 'stackId', upgrade)
 */
const upgradeService = async (client, id, upgrade) => {
  return (await client.post(`services/${id}/?action=upgrade`, upgrade)).data
}

/**
 * @param {AxiosInstance} client -
 * @param {string} id -
 * @returns {Promise<*>} -
 * @example
 * response = checkUpgradeService(client, 'stackId')
 */
const checkUpgradeService = (client, id) => {
  let attempts = 0
  let service = {}
  const upgradeTimeout = 5 * 60
  // eslint-disable-next-line require-jsdoc
  const sleep = ms => new Promise(r => setTimeout(r, ms))

  return pWhilst(
    () => {
      return service.state !== 'upgraded'
    },
    async () => {
      await sleep(2000)
      attempts += 2
      if (attempts > upgradeTimeout) {
        throw new Error(
          'A timeout occured while waiting for Rancher to finish the previous upgrade'
        )
      }
      try {
        const response = await client.get(`services/${id}`)
        service = response.data
      } catch (err) {
        throw new Error(
          'Unable to request the service status from the Rancher API'
        )
      }
    }
  )
}

/**
 * @param {AxiosInstance} client -
 * @param {string} id -
 * @returns {Promise<*>} -
 * @example
 * response = finishUpgradeService(client, 'stackId')
 */
const finishUpgradeService = async (client, id) => {
  return (await client.post(`services/${id}/?action=finishupgrade`)).data
}

/**
 * @class
 */
class Rancher {
  // eslint-disable-next-line jsdoc/require-example
  /**
   * @param {Options} options -
   */
  constructor (options) {
    /** @type {Options} */
    this.config = Object.assign(
      {
        dryRun: false,
        commitVariable: null,
        releaseVariable: null,
        url: process.env.RANCHER_URL,
        accessKey: process.env.RANCHER_ACCESS_KEY,
        secretKey: process.env.RANCHER_SECRET_KEY
      },
      options
    )

    /** @type {AxiosInstance} */
    // @ts-ignore
    this.client = axios.create({
      auth: {
        username: this.config.accessKey,
        password: this.config.secretKey
      },
      baseURL: this.config.url,
      headers: { Accept: 'application/json' }
    })
  }

  /**
   * @returns {Promise<Validate>} -
   * @example
   * const { isValid, errorCode } = client.validate()
   */
  async validate () {
    const { isValid, errorCode } = await validate(this.client)
    return { isValid, errorCode }
  }

  /**
   * @param {string} name -
   * @param {string} version -
   * @param {string} [commit] -
   * @param {boolean} [startFirst=true] -
   * @returns {Promise<Upgrade>} -
   * @example
   * const { isValid, errorCode } = client.upgrade('MyStack/MyService', '1.0.0')
   */
  async upgrade (name, version, commit, startFirst = true) {
    const { commitVariable, dryRun, releaseVariable } = this.config
    const service = await findServiceByName(this.client, name)
    let upgrade = buildUpgradeInstructions(service, version, startFirst)

    if (commitVariable && commit) {
      upgrade = withAdditionalEnvVar(upgrade, commitVariable, commit)
    }

    if (releaseVariable) {
      upgrade = withAdditionalEnvVar(upgrade, releaseVariable, version)
    }

    let response = !dryRun ? await upgradeService(this.client, service.id, upgrade) : {}

    response = !dryRun ? await checkUpgradeService(this.client, service.id) : {}

    response = !dryRun ? await finishUpgradeService(this.client, service.id) : {}

    return { service, upgrade, response }
  }
}

module.exports = Rancher
