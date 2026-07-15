import type { VerifiableCredential } from '@veramo/core'
import {
  Router,
  type Response,
} from 'express'

import {
  authorizationResources,
  type AuthorizationResource,
} from '../../../src/authorization/request.js'
import { AI_IDENTITY_CREDENTIAL_TYPE } from '../../../src/credentials/ai-identity.js'
import {
  getLatestAIIdentityCredential,
} from '../../../src/credentials/get-ai-identity.js'
import { getIdentity } from '../../../src/veramo/identities.js'
import { requireAccessToken } from '../middleware/authenticate.js'

interface RobotProfileResponse {
  readonly robot: {
    readonly id: string
    readonly did: string
    readonly model: string
    readonly manufacturer: string
    readonly environment: AuthorizationResource
    readonly capabilities: readonly string[]
  }
  readonly credential: {
    readonly type: typeof AI_IDENTITY_CREDENTIAL_TYPE
    readonly hash: string
    readonly issuerDid: string
    readonly subjectDid: string
  }
}

interface ErrorResponse {
  readonly error: 'ROBOT_PROFILE_UNAVAILABLE'
  readonly message: string
}

const demoEnvironment = authorizationResources[0]

const getIssuerDid = (
  credential: VerifiableCredential,
): string => {
  const { issuer } = credential

  if (typeof issuer === 'string') {
    return issuer
  }

  if (issuer?.id) {
    return issuer.id
  }

  throw new Error(
    'AI identity credential does not contain an issuer DID',
  )
}

const getSubjectClaims = (
  credential: VerifiableCredential,
  subjectDid: string,
): Record<string, unknown> => {
  const subjects = Array.isArray(
    credential.credentialSubject,
  )
    ? credential.credentialSubject
    : [credential.credentialSubject]

  const subject = subjects.find(
    ({ id }) => id === subjectDid,
  )

  if (!subject) {
    throw new Error(
      'AI identity credential does not belong to the Robot',
    )
  }

  return subject as Record<string, unknown>
}

const readStringClaim = (
  claims: Record<string, unknown>,
  name: string,
): string => {
  const value = claims[name]

  if (
    typeof value !== 'string' ||
    value.trim().length === 0
  ) {
    throw new Error(
      `AI identity credential is missing ${name}`,
    )
  }

  return value
}

const readCapabilities = (
  claims: Record<string, unknown>,
): string[] => {
  const value = claims.capabilities

  if (!Array.isArray(value)) {
    throw new Error(
      'AI identity credential is missing capabilities',
    )
  }

  return value.filter(
    (capability): capability is string =>
      typeof capability === 'string',
  )
}

export const createDemoRouter = (): Router => {
  const router = Router()

  router.get(
    '/robot',
    requireAccessToken('robot:read'),
    async (
      _request,
      response: Response<
        RobotProfileResponse | ErrorResponse
      >,
    ) => {
      try {
        const robot = await getIdentity('robot')

        const storedCredential =
          await getLatestAIIdentityCredential(
            robot.did,
          )

        const credential =
          storedCredential.verifiableCredential

        const claims = getSubjectClaims(
          credential,
          robot.did,
        )

        return response.status(200).json({
          robot: {
            id: readStringClaim(
              claims,
              'agentId',
            ),
            did: robot.did,
            model: readStringClaim(
              claims,
              'model',
            ),
            manufacturer: readStringClaim(
              claims,
              'manufacturer',
            ),
            environment: demoEnvironment,
            capabilities:
              readCapabilities(claims),
          },
          credential: {
            type: AI_IDENTITY_CREDENTIAL_TYPE,
            hash: storedCredential.hash,
            issuerDid:
              getIssuerDid(credential),
            subjectDid: robot.did,
          },
        })
      } catch (error: unknown) {
        console.error(
          'Unable to load Robot profile:',
          error instanceof Error
            ? error.message
            : error,
        )

        return response.status(500).json({
          error: 'ROBOT_PROFILE_UNAVAILABLE',
          message:
            'Unable to load the Robot identity profile',
        })
      }
    },
  )

  return router
}
