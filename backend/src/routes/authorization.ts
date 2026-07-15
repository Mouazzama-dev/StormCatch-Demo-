import {
  Router,
  type Response,
} from 'express'

import {
  issueAuthorizationChallenge,
} from '../../../src/authorization/issue-challenge.js'
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

  return router
}
