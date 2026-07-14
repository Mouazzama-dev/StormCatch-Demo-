import type {
  CredentialVerificationErrorCode,
} from './verify-request-credential.js'
import type {
  PresentationVerificationErrorCode,
} from './verify-request-presentation.js'
import type {
  AuthorizationRequestValidationErrorCode,
} from './validate-request-context.js'
import type { AuthorizationRequest } from './request.js'

export type AuthorizationApprovalReason =
  'VERIFIED_IDENTITY_AND_ALLOWED_ACTION'

export type AuthorizationRejectionReason =
  | AuthorizationRequestValidationErrorCode
  | PresentationVerificationErrorCode
  | CredentialVerificationErrorCode
  | 'ACTION_NOT_PERMITTED'
  | 'INTERNAL_AUTHORIZATION_ERROR'

interface AuthorizationDecisionBase {
  readonly requestId: string
  readonly actorDid: string
  readonly resource: AuthorizationRequest['resource']
  readonly action: AuthorizationRequest['action']
  readonly decidedAt: number
}

export interface ApprovedAuthorizationDecision
  extends AuthorizationDecisionBase {
  readonly decision: 'APPROVE'
  readonly reason: AuthorizationApprovalReason
}

export interface RejectedAuthorizationDecision
  extends AuthorizationDecisionBase {
  readonly decision: 'REJECT'
  readonly reason: AuthorizationRejectionReason
  readonly details?: string
}

export type AuthorizationDecision =
  | ApprovedAuthorizationDecision
  | RejectedAuthorizationDecision

const createDecisionBase = (
  request: AuthorizationRequest,
  decidedAt: number,
): AuthorizationDecisionBase => ({
  requestId: request.requestId,
  actorDid: request.actorDid,
  resource: request.resource,
  action: request.action,
  decidedAt,
})

export const approveAuthorizationRequest = (
  request: AuthorizationRequest,
  decidedAt = Date.now(),
): ApprovedAuthorizationDecision => ({
  ...createDecisionBase(request, decidedAt),
  decision: 'APPROVE',
  reason: 'VERIFIED_IDENTITY_AND_ALLOWED_ACTION',
})

export const rejectAuthorizationRequest = (
  request: AuthorizationRequest,
  reason: AuthorizationRejectionReason,
  details?: string,
  decidedAt = Date.now(),
): RejectedAuthorizationDecision => ({
  ...createDecisionBase(request, decidedAt),
  decision: 'REJECT',
  reason,
  ...(details ? { details } : {}),
})
