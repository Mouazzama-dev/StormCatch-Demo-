import type {
  VerifiablePresentation,
} from '@veramo/core'
import {
  Router,
  type Request,
  type Response,
} from 'express'

import {
  authorizeRequest,
} from '../../../src/authorization/authorize-request.js'
import {
  issueAuthorizationChallenge,
} from '../../../src/authorization/issue-challenge.js'
import {
  authorizationActions,
  authorizationResources,
  type AuthorizationAction,
  type AuthorizationResource,
} from '../../../src/authorization/request.js'
import {
  requireAccessToken,
} from '../middleware/authenticate.js'

interface AuthorizationChallengeResponse {
  readonly requestId: string
  readonly challenge: string
  readonly domain: string
  readonly issuedAt: string
  readonly expiresAt: string
  readonly status: 'issued'
}

interface CreateAuthorizationRequestBody {
  readonly requestId?: unknown
  readonly actorDid?: unknown
  readonly resource?: unknown
  readonly action?: unknown
  readonly presentation?: unknown
}

interface AuthorizationDecisionResponse {
  readonly requestId: string
  readonly status: 'completed'
  readonly decision: 'APPROVE' | 'REJECT'
  readonly reason: string
  readonly details?: string
  readonly actorDid: string
  readonly resource: AuthorizationResource
  readonly action: AuthorizationAction
  readonly verification: {
    readonly tokenVerified: true
    readonly presentationVerified: boolean
    readonly credentialVerified: boolean
    readonly challengeConsumed: boolean
  }
  readonly policy: {
    readonly id: string
    readonly permitted: boolean
  } | null
  readonly credential: {
    readonly type: string
    readonly issuerDid: string
    readonly subjectDid: string
  } | null
}

interface ErrorResponse {
  readonly error: 'INVALID_REQUEST'
  readonly message: string
}

const isAuthorizationResource = (
  value: unknown,
): value is AuthorizationResource =>
  typeof value === 'string' &&
  authorizationResources.some(
    (resource) => resource === value,
  )

const isAuthorizationAction = (
  value: unknown,
): value is AuthorizationAction =>
  typeof value === 'string' &&
  authorizationActions.some(
    (action) => action === value,
  )

const isPresentation = (
  value: unknown,
): value is VerifiablePresentation => {
  if (
    typeof value !== 'object' ||
    value === null
  ) {
    return false
  }

  const holder = Reflect.get(value, 'holder')

  return (
    typeof holder === 'string' &&
    holder.trim().length > 0
  )
}

export const createAuthorizationRouter = (): Router => {
  const router = Router()

  router.post(
    '/challenges',
    requireAccessToken('challenge:create'),
    (
      _request,
      response: Response<AuthorizationChallengeResponse>,
    ) => {
      const challenge =
        issueAuthorizationChallenge()

      response.set('Cache-Control', 'no-store')

      return response.status(201).json({
        requestId: challenge.requestId,
        challenge: challenge.challenge,
        domain: challenge.domain,
        issuedAt: new Date(
          challenge.issuedAt,
        ).toISOString(),
        expiresAt: new Date(
          challenge.expiresAt,
        ).toISOString(),
        status: challenge.status,
      })
    },
  )

  router.post(
    '/requests',
    requireAccessToken('authorization:submit'),
    async (
      request: Request<
        Record<string, never>,
        AuthorizationDecisionResponse | ErrorResponse,
        CreateAuthorizationRequestBody
      >,
      response: Response<
        AuthorizationDecisionResponse | ErrorResponse
      >,
    ) => {
      const {
        requestId,
        actorDid,
        resource,
        action,
        presentation,
      } = request.body ?? {}

      if (
        typeof requestId !== 'string' ||
        requestId.trim().length === 0 ||
        typeof actorDid !== 'string' ||
        actorDid.trim().length === 0 ||
        !isAuthorizationResource(resource) ||
        !isAuthorizationAction(action) ||
        !isPresentation(presentation)
      ) {
        return response.status(400).json({
          error: 'INVALID_REQUEST',
          message:
            'requestId, actorDid, resource, action and presentation are required',
        })
      }

      const result = await authorizeRequest({
        request: {
          requestId,
          actorDid,
          resource,
          action,
          presentation,
        },
      })

      const details =
        result.decision.decision === 'REJECT'
          ? result.decision.details
          : undefined

      response.set('Cache-Control', 'no-store')

      return response.status(200).json({
        requestId: result.decision.requestId,
        status: 'completed',
        decision: result.decision.decision,
        reason: result.decision.reason,
        ...(details ? { details } : {}),
        actorDid: result.decision.actorDid,
        resource: result.decision.resource,
        action: result.decision.action,
        verification: {
          tokenVerified: true,
          presentationVerified:
            result.verification.presentationVerified,
          credentialVerified:
            result.verification.credentialVerified,
          challengeConsumed:
            result.verification.presentationVerified,
        },
        policy: result.policy
          ? {
              id: result.policy.policyId,
              permitted: result.policy.permitted,
            }
          : null,
        credential: result.credentialEvidence
          ? {
              type:
                result.credentialEvidence.type,
              issuerDid:
                result.credentialEvidence.issuerDid,
              subjectDid:
                result.credentialEvidence.subjectDid,
            }
          : null,
      })
    },
  )

  return router
}
