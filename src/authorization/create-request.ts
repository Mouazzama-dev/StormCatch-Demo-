import type { IssuedAuthorizationChallenge } from './challenge.js'
import { createRobotAuthorizationPresentation } from './create-presentation.js'
import type {
  AuthorizationAction,
  AuthorizationRequest,
  AuthorizationResource,
} from './request.js'

interface CreateAuthorizationRequestArgs {
  readonly challenge: IssuedAuthorizationChallenge
  readonly resource: AuthorizationResource
  readonly action: AuthorizationAction
}

export interface CreatedAuthorizationRequest {
  readonly credentialHash: string
  readonly request: AuthorizationRequest
}

export const createAuthorizationRequest = async ({
  challenge,
  resource,
  action,
}: CreateAuthorizationRequestArgs): Promise<CreatedAuthorizationRequest> => {
  const {
    credentialHash,
    presentation,
  } = await createRobotAuthorizationPresentation(challenge)

  const actorDid = presentation.holder

  if (typeof actorDid !== 'string' || actorDid.length === 0) {
    throw new Error(
      'Authorization presentation does not contain a valid holder DID',
    )
  }

  return {
    credentialHash,
    request: {
      requestId: challenge.requestId,
      actorDid,
      resource,
      action,
      presentation,
    },
  }
}
