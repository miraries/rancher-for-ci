export = Rancher

declare class Rancher {
  constructor(options: Rancher.Options);
  validate(): Promise<Rancher.Validate>
  upgrade(
    name: string,
    version: string,
    commit?: string | null | undefined,
    startFirst?: boolean = true): Promise<Rancher.Upgrade>
}

declare namespace Rancher {
  export type ErrorCode = 'UNKNOWN' | 'NOT_FOUND_ENVIRONMENT' | 'UNAUTHORIZED'

  export interface Validate {
    readonly isValid: boolean
    readonly errorCode: ErrorCode
  }

  export interface Link {
    readonly self: string
    readonly account: string
    readonly instances: string
  }

  export interface ServiceLink extends Link {
    readonly consumedbyservices: string
    readonly consumedservices: string
    readonly networkDrivers: string
    readonly serviceExposeMaps: string
    readonly serviceLogs: string
    readonly storageDrivers: string
    readonly containerStats: string
    readonly environment: string
  }

  export interface StackLink extends Link {
    readonly hosts: string
    readonly scheduledUpgrades: string
    readonly secrets: string
    readonly services: string
    readonly volumeTemplates: string
    readonly volumes: string
    readonly composeConfig: any
  }

  export interface Action {
    readonly update: string
    readonly upgrade: string
    readonly remove: string
  }

  export interface ActionService {
    readonly restart: string
    readonly deactivate: string
    readonly removeservicelink: string
    readonly addservicelink: string
    readonly setservicelinks: string
  }

  export interface ActionStack {
    readonly deactivateservices: string
    readonly activateservices: string
    readonly addoutputs: string
    readonly exportconfig: string
  }

  interface Dictionary {
    [string]: any
  }

  export interface LogConfig {
    readonly type: string
    readonly config: Dictionary
    readonly driver: string
  }

  export interface LaunchConfig {
    readonly type: string
    readonly command: string[]
    readonly dataVolumes: string[]
    readonly environment: Dictionary
    readonly imageUuid: string
    readonly instanceTriggeredStop: string
    readonly kind: string
    readonly labels: Dictionary
    readonly logConfig: LogConfig
    readonly networkMode: string
    readonly pidMode: string
    readonly privileged: boolean
    readonly publishAllPorts: boolean
    readonly readOnly: boolean
    readonly runInit: boolean
    readonly startOnCreate: boolean
    readonly stdinOpen: boolean
    readonly system: boolean
    readonly tty: boolean
    readonly version: string
    readonly vcpu: number
    readonly drainTimeoutMs: number
  }

  export interface Service {
    readonly id: string
    readonly type: string
    readonly links: ServiceLink
    readonly actions: ActionService
    readonly baseType: string
    readonly name: string
    readonly state: string
    readonly accountId: string
    readonly assignServiceIpAddress: boolean
    readonly createIndex: number
    readonly created: string
    readonly createdTS: number
    readonly currentScale: number
    readonly description: any
    readonly externalId: any
    readonly fqdn: any
    readonly healthState: string
    readonly instanceIds: number[]
    readonly kind: string
    readonly launchConfig: LaunchConfig
    readonly lbConfig: any
    readonly linkedServices: any
    readonly metadata: Dictionary
    readonly publicEndpoints: any
    readonly removed: any
    readonly retainIp: any
    readonly scale: number
    readonly scalePolicy: any
    readonly secondaryLaunchConfigs: any[]
    readonly selectorContainer: any
    readonly selectorLink: any
    readonly stackId: string
    readonly startOnCreate: boolean
    readonly system: boolean
    readonly transitioning: string
    readonly transitioningMessage: any
    readonly transitioningProgress: any
    readonly upgrade: any
    readonly uuid: string
    readonly vip: any
    readonly environmentId: string
  }

  export interface Stack {
    readonly id: string
    readonly type: string
    readonly links: StackLink
    readonly actions: ActionStack
    readonly baseType: string
    readonly name: string
    readonly state: string
    readonly accountId: string
    readonly answers: any
    readonly binding: any
    readonly created: string
    readonly createdTS: number
    readonly description: any
    readonly dockerCompose: string
    readonly environment: any
    readonly externalId: string
    readonly group: any
    readonly healthState: string
    readonly kind: string
    readonly outputs: any
    readonly previousEnvironment: any
    readonly previousExternalId: any
    readonly rancherCompose: string
    readonly removed: any
    readonly serviceIds: any
    readonly startOnCreate: any
    readonly system: boolean
    readonly templates: any
    readonly transitioning: string
    readonly transitioningMessage: any
    readonly transitioningProgress: any
    readonly uuid: string
  }

  export interface InServiceStrategy {
    launchConfig: LaunchConfig
    startFirst?: boolean
  }

  export interface ServiceUpgrade {
    inServiceStrategy: InServiceStrategy
  }

  export interface Upgrade {
    service: Service
    upgrade: ServiceUpgrade
    response: any
  }

  export interface Options {
    url: string
    accessKey: string
    secretKey: string
    dryRun?: boolean = false
    commitVariable?: string = null
    releaseVariable?: string = null
  }
}
