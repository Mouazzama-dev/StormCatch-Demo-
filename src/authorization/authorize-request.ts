import {
  approveAuthorizationRequest,
  rejectAuthorizationRequest,
  type AuthorizationDecision,
  type AuthorizationRejectionReason,
} from './decision.js'
import {
  evaluateAuthorizationPolicy,
  type AuthorizationPolicyEvaluation,
} from './policy.js'
import type { AuthorizationRequest } from './request.js'
import {
  AuthorizationRequestValidationError,
} from './validate-request-context.js'
import {
  CredentialVerificationError,
  type VerifiedCredentialEvidence,
  verifyAuthorizationRequestCredential,
} from './verify-request-credential.js'
import {
  PresentationVerificationError,
  verifyAuthorizationRequestPresentation,
} from './verify-request-presentation.js'
import {
  AuthorizationChallengeStore,
  authorizationChallengeStore,
} from './challenge-store.js'

export interface AuthorizationVerificationSummary {
  readonly presentationVerified: boolean
  readonly credentialVerified: boolean
}

export interface AuthorizationResult {
  readonly decision: AuthorizationDecision
  readonly verification: AuthorizationVerificationSummary
  readonly policy?: AuthorizationPolicyEvaluation
  readonly credentialEvidence?: VerifiedCredentialEvidence
}

interface AuthorizeRequestArgs {
  readonly request: AuthorizationRequest
  readonly store?: AuthorizationChallengeStore
  readonly clock?: () => number
}

const getRejectionReason = (
  error: unknown,
): AuthorizationRejectionReason => {
  if (
    error instanceof AuthorizationRequestValidationError ||
    error instanceof PresentationVerificationError ||
    error instanceof CredentialVerificationError
  ) {
    return error.code
  }

  return 'INTERNAL_AUTHORIZATION_ERROR'
}

const getErrorDetails = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : 'Unknown authorization error'

export const authorizeRequest = async ({
  request,
  store = authorizationChallengeStore,
  clock = Date.now,
}: AuthorizeRequestArgs): Promise<AuthorizationResult> => {
  let presentationVerified = false
  let credentialVerified = false

  try {
    const presentationResult =
      await verifyAuthorizationRequestPresentation({
        request,
        store,
        clock,
      })

    presentationVerified = true

    const credentialResult =
      await verifyAuthorizationRequestCredential(
        presentationResult,
      )

    credentialVerified = true

    const policy = evaluateAuthorizationPolicy({
      resource: request.resource,
      action: request.action,
    })

    const decision = policy.permitted
      ? approveAuthorizationRequest(request, clock())
      : rejectAuthorizationRequest(
          request,
          'ACTION_NOT_PERMITTED',
          `Action ${request.action} is not permitted for ${request.resource}`,
          clock(),
        )

    return {
      decision,
      verification: {
        presentationVerified,
        credentialVerified,
      },
      policy,
      credentialEvidence:
        credentialResult.credentialEvidence,
    }
  } catch (error: unknown) {
    return {
      decision: rejectAuthorizationRequest(
        request,
        getRejectionReason(error),
        getErrorDetails(error),
        clock(),
      ),
      verification: {
        presentationVerified,
        credentialVerified,
      },
    }
  }
}
