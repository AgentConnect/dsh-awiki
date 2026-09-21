import type { AwikiIdentityMethodCapabilities } from '../src/types.ts'
export const WBA_METHOD_CAPABILITIES: AwikiIdentityMethodCapabilities = {
  method: 'wba', handleRecovery: true, rootImport: true, rootTransfer: true, servicesUpdate: false,
}
export const WEB_METHOD_CAPABILITIES: AwikiIdentityMethodCapabilities = {
  method: 'web', handleRecovery: false, rootImport: false, rootTransfer: false, servicesUpdate: true,
}
