import type {
  VerifiableCredential,
  VerifiablePresentation,
} from '@veramo/core'
import {
  Router,
  type Request,
  type Response,
} from 'express'

import {
  authorizationChallengeStore,
  ChallengeStoreError,
} from '../../../src/authorization/challenge-store.js'
import {
  createRobotAuthorizationPresentation,
} from '../../../src/authorization/create-presentation.js'
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
import { reputationEngine } from '../reputation/reputation-engine.js'
import type {
  ReputationScore,
} from '../reputation/types.js'
import { authorizationResultStore } from '../services/authorization-result-store.js'

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

interface RobotReputationResponse {
  readonly robotDid: string
  readonly scores: readonly ReputationScore[]
}

interface CreatePresentationRequestBody {
  readonly requestId?: unknown
}

interface RobotPresentationResponse {
  readonly requestId: string
  readonly actorDid: string
  readonly credentialHash: string
  readonly presentation: VerifiablePresentation
}

interface ErrorResponse {
  readonly error:
    | 'INVALID_REQUEST'
    | 'CHALLENGE_NOT_FOUND'
    | 'CHALLENGE_ALREADY_CONSUMED'
    | 'CHALLENGE_EXPIRED'
    | 'ROBOT_PROFILE_UNAVAILABLE'
    | 'REPUTATION_UNAVAILABLE'
    | 'PRESENTATION_CREATION_FAILED'
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

  router.get(
    '/robot/reputation',
    requireAccessToken('reputation:read'),
    async (
      _request,
      response: Response<
        RobotReputationResponse | ErrorResponse
      >,
    ) => {
      try {
        const robot = await getIdentity('robot')

        const events =
          await authorizationResultStore
            .getAllByActorDid(robot.did)

        const scores =
          reputationEngine.calculateAll({
            robotDid: robot.did,
            events,
          })

        response.set('Cache-Control', 'no-store')

        return response.status(200).json({
          robotDid: robot.did,
          scores,
        })
      } catch (error: unknown) {
        console.error(
          'Unable to calculate Robot reputation:',
          error instanceof Error
            ? error.message
            : error,
        )

        return response.status(500).json({
          error: 'REPUTATION_UNAVAILABLE',
          message:
            'Unable to calculate the Robot reputation',
        })
      }
    },
  )

  router.post(
    '/robot/presentations',
    requireAccessToken('presentation:create'),
    async (
      request: Request<
        Record<string, never>,
        RobotPresentationResponse | ErrorResponse,
        CreatePresentationRequestBody
      >,
      response: Response<
        RobotPresentationResponse | ErrorResponse
      >,
    ) => {
      const { requestId } = request.body ?? {}

      if (
        typeof requestId !== 'string' ||
        requestId.trim().length === 0
      ) {
        return response.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'requestId is required',
        })
      }

      try {
        const challenge =
          authorizationChallengeStore.get(requestId)

        if (challenge.status === 'consumed') {
          return response.status(409).json({
            error: 'CHALLENGE_ALREADY_CONSUMED',
            message:
              'The authorization challenge has already been consumed',
          })
        }

        if (challenge.status === 'expired') {
          return response.status(410).json({
            error: 'CHALLENGE_EXPIRED',
            message:
              'The authorization challenge has expired',
          })
        }

        const {
          credentialHash,
          presentation,
        } =
          await createRobotAuthorizationPresentation(
            challenge,
          )

        const actorDid = presentation.holder

        if (
          typeof actorDid !== 'string' ||
          actorDid.length === 0
        ) {
          throw new Error(
            'Created presentation does not contain a holder DID',
          )
        }

        response.set('Cache-Control', 'no-store')

        return response.status(200).json({
          requestId,
          actorDid,
          credentialHash,
          presentation,
        })
      } catch (error: unknown) {
        if (
          error instanceof ChallengeStoreError &&
          error.code === 'CHALLENGE_NOT_FOUND'
        ) {
          return response.status(404).json({
            error: 'CHALLENGE_NOT_FOUND',
            message:
              'No authorization challenge exists for the supplied requestId',
          })
        }

        console.error(
          'Unable to create Robot presentation:',
          error instanceof Error
            ? error.message
            : error,
        )

        return response.status(500).json({
          error: 'PRESENTATION_CREATION_FAILED',
          message:
            'Unable to create the Robot presentation',
        })
      }
    },
  )

  return router
}