import {
  Router,
  type Request,
  type Response,
} from 'express'

import {
  requireAccessToken,
} from '../middleware/authenticate.js'
import {
  auditRecordStore,
  type StoredAuditRecord,
} from '../services/audit-record-store.js'
import {
  authorizationResultStore,
  type StoredAuthorizationResult,
} from '../services/authorization-result-store.js'

interface AuditDetailsResponse {
  readonly requestId: string
  readonly authorizationEventCount: number
  readonly auditRecordCount: number
  readonly authorizationEvents:
    readonly StoredAuthorizationResult[]
  readonly auditRecords:
    readonly StoredAuditRecord[]
}

interface AuditErrorResponse {
  readonly error:
    | 'INVALID_REQUEST'
    | 'AUDIT_NOT_FOUND'
    | 'AUDIT_READ_FAILED'
  readonly message: string
}

export const createAuditRouter = (): Router => {
  const router = Router()

  router.get(
    '/:requestId',
    requireAccessToken('audit:read'),
    async (
      request: Request<
        {
          requestId: string
        },
        AuditDetailsResponse | AuditErrorResponse
      >,
      response: Response<
        AuditDetailsResponse | AuditErrorResponse
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
        const [
          authorizationEvents,
          auditRecords,
        ] = await Promise.all([
          authorizationResultStore
            .getAllByRequestId(requestId),
          auditRecordStore
            .getByRequestId(requestId),
        ])

        if (
          authorizationEvents.length === 0 &&
          auditRecords.length === 0
        ) {
          return response.status(404).json({
            error: 'AUDIT_NOT_FOUND',
            message:
              'No audit records were found for this requestId',
          })
        }

        response.set(
          'Cache-Control',
          'no-store',
        )

        return response.status(200).json({
          requestId,
          authorizationEventCount:
            authorizationEvents.length,
          auditRecordCount:
            auditRecords.length,
          authorizationEvents,
          auditRecords,
        })
      } catch (error: unknown) {
        console.error(
          'Unable to read audit details:',
          error instanceof Error
            ? error.message
            : error,
        )

        return response.status(500).json({
          error: 'AUDIT_READ_FAILED',
          message:
            'Unable to read the audit records',
        })
      }
    },
  )

  return router
}
