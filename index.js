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
  const { upgrade: { inServiceStrategy } } = service
  const { launchConfig: { imageUuid } } = inServiceStrategy

  const [ type, repo, ] = imageUuid.split(':')
  const image = [ type, repo, newVersion ].join(':')

  return merge(
    { inServiceStrategy },
    { inServiceStrategy: { launchConfig: { imageUuid: image } } }
  )
}

const upgradeService = async (client, id, upgrade) => {
  return (await client.post(`services/${id}/?action=upgrade`, upgrade)).data
}

class Rancher {
  constructor (envUrl, envAccessKey, envSecretKey) {
    this.client = axios.create({
      auth: { username: envAccessKey, password: envSecretKey },
      baseURL: envUrl,
      headers: { 'Accept': 'application/json' }
    })
  }

  async upgrade (name, version) {
    const service = await findServiceByName(this.client, name)
    const upgrade = await buildUpgradeInstructions(service, version)

    return upgradeService(this.client, service.id, upgrade)
  }
}

module.exports = Rancher
