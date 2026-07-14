import type { IssuedAuthorizationChallenge } from './challenge.js'
import {
  AuthorizationChallengeStore,
  authorizationChallengeStore,
  ChallengeStoreError,
} from './challenge-store.js'
import type { AuthorizationRequest } from './request.js'

export type AuthorizationRequestValidationErrorCode =
  | 'CHALLENGE_NOT_FOUND'
  | 'CHALLENGE_ALREADY_CONSUMED'
  | 'CHALLENGE_EXPIRED'
  | 'REQUEST_ID_MISMATCH'
  | 'PRESENTATION_HOLDER_MISSING'
  | 'ACTOR_DID_MISMATCH'

export class AuthorizationRequestValidationError extends Error {
  constructor(
    readonly code: AuthorizationRequestValidationErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'AuthorizationRequestValidationError'
  }
}

interface ValidateAuthorizationRequestContextArgs {
  readonly request: AuthorizationRequest
  readonly now?: number
  readonly store?: AuthorizationChallengeStore
}

export const validateAuthorizationRequestContext = ({
  request,
  now = Date.now(),
  store = authorizationChallengeStore,
}: ValidateAuthorizationRequestContextArgs): IssuedAuthorizationChallenge => {
  let challenge

  try {
    challenge = store.get(request.requestId, now)
  } catch (error: unknown) {
    if (
      error instanceof ChallengeStoreError &&
      error.code === 'CHALLENGE_NOT_FOUND'
    ) {
      throw new AuthorizationRequestValidationError(
        'CHALLENGE_NOT_FOUND',
        error.message,
      )
    }

    throw error
  }

  if (challenge.requestId !== request.requestId) {
    throw new AuthorizationRequestValidationError(
      'REQUEST_ID_MISMATCH',
      'Authorization request ID does not match the stored challenge',
    )
  }

  if (challenge.status === 'consumed') {
    throw new AuthorizationRequestValidationError(
      'CHALLENGE_ALREADY_CONSUMED',
      `Challenge was already consumed for request ${request.requestId}`,
    )
  }

  if (challenge.status === 'expired') {
    throw new AuthorizationRequestValidationError(
      'CHALLENGE_EXPIRED',
      `Challenge expired for request ${request.requestId}`,
    )
  }

  const holderDid = request.presentation.holder

  if (
    typeof holderDid !== 'string' ||
    holderDid.trim().length === 0
  ) {
    throw new AuthorizationRequestValidationError(
      'PRESENTATION_HOLDER_MISSING',
      'Authorization presentation does not contain a holder DID',
    )
  }

  if (holderDid !== request.actorDid) {
    throw new AuthorizationRequestValidationError(
      'ACTOR_DID_MISMATCH',
      'Authorization request actor does not match the presentation holder',
    )
  }

  return challenge
}
