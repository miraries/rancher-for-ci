'use strict'

const axios = require('axios')
const merge = require('lodash.merge')

const getStacks = async (client) => {
  return (await client.get('environments/')).data.data
}

const getServices = async (client) => {
  return (await client.get('services/')).data.data
}

const fetchStackByName = async (stacks, name) => {
  return stacks.filter(stack => stack.name === name)
               .pop()
}

const fetchServiceByName = async (services, name, stackId = null) => {
  return services.filter(s => s.name === name)
                 .filter(s => !stackId || s.environmentId === stackId)
                 .pop()
}

const findStackByName = async (client, name) => {
  const stacks = await getStacks(client)
  const stack = await fetchStackByName(stacks, name)

  if (!stack) {
    throw new Error (`Unable to locate stack '${stack}'`)
  }

  return stack
}

const findServiceByName = async (client, name) => {
  const [ service, stack ] = name.toLowerCase().split('/').reverse()
  const services = await getServices(client)

  const stackId = stack ? (await findStackByName(client, stack)).id : null
  const locatedService = await fetchServiceByName(services, service, stackId)

  if (!locatedService) {
    throw new Error(`Unable to locate service '${service}'`)
  }

  return locatedService
}

const buildUpgradeInstructions = async (service, newVersion) => {
  const { launchConfig, launchConfig: { imageUuid } } = service

  const [ type, repo, ] = imageUuid.split(':')
  const image = [ type, repo, newVersion ].join(':')

  return merge(
    { inServiceStrategy: { launchConfig } },
    { inServiceStrategy: { launchConfig: { imageUuid: image }, startFirst: true } }
  )
}

const withAdditionalEnvVar = async (instruction, variable, value) => {
  const launchConfig = { environment: { [variable]: value } }

  return merge(
    instruction,
    { inServiceStrategy: { launchConfig } }
  )
}

const upgradeService = async (client, id, upgrade) => {
  return (await client.post(`services/${id}/?action=upgrade`, upgrade)).data
}

class Rancher {
  constructor (options) {
    this.config = Object.assign({
      dryRun: false,
      commitVariable: null,
      releaseVariable: null,
      url: process.env.RANCHER_URL,
      accessKey: process.env.RANCHER_ACCESS_KEY,
      secretKey: process.env.RANCHER_SECRET_KEY
    }, options)

    this.client = axios.create({
      auth: {
        username: this.config.accessKey,
        password: this.config.secretKey
      },
      baseURL: this.config.url,
      headers: { 'Accept': 'application/json' }
    })
  }

  async upgrade (name, version, commit) {
    const { commitVariable, dryRun, releaseVariable } = this.config
    const service = await findServiceByName(this.client, name)
    let upgrade = await buildUpgradeInstructions(service, version)

    if (commitVariable && commit) {
      upgrade = await withAdditionalEnvVar(upgrade, commitVariable, commit)
    }

    if (releaseVariable) {
      upgrade = await withAdditionalEnvVar(upgrade, releaseVariable, version)
    }

    const response = (!dryRun)
      ? await upgradeService(this.client, service.id, upgrade)
      : {}

    return { service, upgrade, response }
  }
}

module.exports = Rancher
