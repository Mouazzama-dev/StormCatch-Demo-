import { agent } from '../veramo/agent.js'
import type { ConsumedAuthorizationChallenge } from './challenge.js'
import {
  AuthorizationChallengeStore,
  authorizationChallengeStore,
} from './challenge-store.js'
import type { AuthorizationRequest } from './request.js'
import {
  validateAuthorizationRequestContext,
} from './validate-request-context.js'

export type PresentationVerificationErrorCode =
  'PRESENTATION_VERIFICATION_FAILED'

export class PresentationVerificationError extends Error {
  constructor(
    readonly code: PresentationVerificationErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'PresentationVerificationError'
  }
}

export interface VerifiedAuthorizationRequest {
  readonly request: AuthorizationRequest
  readonly challenge: ConsumedAuthorizationChallenge
  readonly presentationVerified: true
}

interface VerifyAuthorizationRequestPresentationArgs {
  readonly request: AuthorizationRequest
  readonly store?: AuthorizationChallengeStore
  readonly clock?: () => number
}

export const verifyAuthorizationRequestPresentation = async ({
  request,
  store = authorizationChallengeStore,
  clock = Date.now,
}: VerifyAuthorizationRequestPresentationArgs): Promise<
  VerifiedAuthorizationRequest
> => {
  const challenge = validateAuthorizationRequestContext({
    request,
    store,
    now: clock(),
  })

  const verification = await agent.verifyPresentation({
    presentation: request.presentation,
    challenge: challenge.challenge,
    domain: challenge.domain,
  })

  if (!verification.verified) {
    throw new PresentationVerificationError(
      'PRESENTATION_VERIFICATION_FAILED',
      verification.error?.message ??
        'Authorization presentation verification failed',
    )
  }

  const consumedChallenge = store.consume(
    request.requestId,
    clock(),
  )

  return {
    request,
    challenge: consumedChallenge,
    presentationVerified: true,
  }
}
