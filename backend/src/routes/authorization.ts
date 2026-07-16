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
import {
  authorizationResultStore,
  type StoredAuthorizationResult,
} from '../services/authorization-result-store.js'

import {
  createAuthorizationAuditDigest,
} from '../services/audit-hash-service.js'
import {
  auditRecordStore,
  type StoredAuditRecord,
} from '../services/audit-record-store.js'

import { randomUUID } from 'node:crypto'

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

type AuthorizationDecisionResponse =
  StoredAuthorizationResult

interface AuthorizationHistoryResponse {
  readonly requestId: string
  readonly eventCount: number
  readonly events: readonly StoredAuthorizationResult[]
}

interface ErrorResponse {
  readonly error:
    | 'INVALID_REQUEST'
    | 'REQUEST_NOT_FOUND'
    | 'LOG_READ_FAILED'
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

  const holder = Reflect.get(
    value,
    'holder',
  )

  return (
    typeof holder === 'string' &&
    holder.trim().length > 0
  )
}

export const createAuthorizationRouter =
  (): Router => {
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

        response.set(
          'Cache-Control',
          'no-store',
        )

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
      requireAccessToken(
        'authorization:submit',
      ),
      async (
        request: Request<
          Record<string, never>,
          | AuthorizationDecisionResponse
          | ErrorResponse,
          CreateAuthorizationRequestBody
        >,
        response: Response<
          | AuthorizationDecisionResponse
          | ErrorResponse
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
          !isAuthorizationResource(
            resource,
          ) ||
          !isAuthorizationAction(action) ||
          !isPresentation(presentation)
        ) {
          return response.status(400).json({
            error: 'INVALID_REQUEST',
            message:
              'requestId, actorDid, resource, action and presentation are required',
          })
        }

        const result =
          await authorizeRequest({
            request: {
              requestId,
              actorDid,
              resource,
              action,
              presentation,
            },
          })

        const details =
          result.decision.decision ===
          'REJECT'
            ? result.decision.details
            : undefined

        const storedResult: StoredAuthorizationResult =
          {
            schemaVersion: '1.0',
            eventId: randomUUID(),
            eventType: 'AUTHORIZATION_DECISION',
            requestId:
              result.decision.requestId,
            status: 'completed',
            decision:
              result.decision.decision,
            reason:
              result.decision.reason,
            ...(details
              ? { details }
              : {}),
            actorDid:
              result.decision.actorDid,
            resource:
              result.decision.resource,
            action:
              result.decision.action,
            verification: {
              tokenVerified: true,
              presentationVerified:
                result.verification
                  .presentationVerified,
              credentialVerified:
                result.verification
                  .credentialVerified,
              challengeConsumed:
                result.verification
                  .presentationVerified,
            },
            policy: result.policy
              ? {
                  id: result.policy.policyId,
                  permitted:
                    result.policy.permitted,
                }
              : null,
            credential:
              result.credentialEvidence
                ? {
                    type:
                      result
                        .credentialEvidence
                        .type,
                    issuerDid:
                      result
                        .credentialEvidence
                        .issuerDid,
                    subjectDid:
                      result
                        .credentialEvidence
                        .subjectDid,
                  }
                : null,
            createdAt:
              new Date().toISOString(),
          }

        await authorizationResultStore.save(
          storedResult,
        )

        const auditDigest =
  createAuthorizationAuditDigest(
    storedResult,
  )

const auditRecord: StoredAuditRecord = {
  schemaVersion: '1.0',
  auditId: randomUUID(),
  eventType:
    'AUTHORIZATION_AUDIT_DIGEST',
  eventId: storedResult.eventId,
  requestId: storedResult.requestId,
  algorithm: auditDigest.algorithm,
  hash: auditDigest.hash,
  canonicalJson:
    auditDigest.canonicalJson,
  createdAt: new Date().toISOString(),
}

await auditRecordStore.save(
  auditRecord,
)

        response.set(
          'Cache-Control',
          'no-store',
        )

        return response
          .status(200)
          .json(storedResult)
      },
    )

    router.get(
  '/requests/:requestId',
  requireAccessToken('authorization:read'),
  async (
    request: Request<
      {
        requestId: string
      },
      AuthorizationHistoryResponse | ErrorResponse
    >,
    response: Response<
      AuthorizationHistoryResponse | ErrorResponse
    >,
  ) => {
    const requestId =
      request.params.requestId.trim()

    if (requestId.length === 0) {
      return response.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'requestId is required',
      })
    }

    try {
      const events =
        await authorizationResultStore.getAllByRequestId(
          requestId,
        )

      if (events.length === 0) {
        return response.status(404).json({
          error: 'REQUEST_NOT_FOUND',
          message:
            'No authorization events were found for this requestId',
        })
      }

      response.set('Cache-Control', 'no-store')

      return response.status(200).json({
        requestId,
        eventCount: events.length,
        events,
      })
    } catch (error: unknown) {
      console.error(
        'Unable to read authorization history:',
        error instanceof Error
          ? error.message
          : error,
      )

      return response.status(500).json({
        error: 'LOG_READ_FAILED',
        message:
          'Unable to read the authorization history',
      })
    }
  },
)
    return router
  }