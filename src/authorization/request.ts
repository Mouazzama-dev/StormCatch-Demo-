import type { VerifiablePresentation } from '@veramo/core'

export const authorizationResources = [
  'warehouse-zone-a',
] as const

export const authorizationActions = [
  'scan-inventory',
  'move-container',
] as const

export type AuthorizationResource =
  (typeof authorizationResources)[number]

export type AuthorizationAction =
  (typeof authorizationActions)[number]

export interface AuthorizationRequest {
  readonly requestId: string
  readonly actorDid: string
  readonly resource: AuthorizationResource
  readonly action: AuthorizationAction
  readonly presentation: VerifiablePresentation
}
