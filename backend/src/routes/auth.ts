import { timingSafeEqual } from 'node:crypto'

import {
  Router,
  type Request,
  type Response,
} from 'express'

import { authConfig } from '../config/auth.js'
import {
  issueAccessToken,
} from '../services/token-service.js'

interface TokenRequestBody {
  readonly clientId?: unknown
  readonly clientSecret?: unknown
}

interface ErrorResponse {
  readonly error: string
  readonly message: string
}

interface TokenResponse {
  readonly accessToken: string
  readonly tokenType: 'Bearer'
  readonly expiresIn: number
  readonly scope: readonly string[]
}

const secretsMatch = (
  providedSecret: string,
  expectedSecret: string,
): boolean => {
  const provided = Buffer.from(providedSecret)
  const expected = Buffer.from(expectedSecret)

  if (provided.length !== expected.length) {
    return false
  }

  return timingSafeEqual(provided, expected)
}

export const createAuthRouter = (): Router => {
  const router = Router()

  router.post(
    '/token',
    async (
      request: Request<
        Record<string, never>,
        TokenResponse | ErrorResponse,
        TokenRequestBody
      >,
      response: Response<
        TokenResponse | ErrorResponse
      >,
    ) => {
      const {
        clientId,
        clientSecret,
      } = request.body ?? {}

      if (
        typeof clientId !== 'string' ||
        typeof clientSecret !== 'string' ||
        clientId.length === 0 ||
        clientSecret.length === 0
      ) {
        return response.status(400).json({
          error: 'INVALID_REQUEST',
          message:
            'clientId and clientSecret are required',
        })
      }

      const credentialsValid =
        clientId === authConfig.client.id &&
        secretsMatch(
          clientSecret,
          authConfig.client.secret,
        )

      if (!credentialsValid) {
        return response.status(401).json({
          error: 'INVALID_CLIENT',
          message: 'Invalid client credentials',
        })
      }

      const issuedToken = await issueAccessToken({
        clientId,
        scopes: authConfig.client.scopes,
      })

      return response.status(200).json({
        accessToken: issuedToken.token,
        tokenType: issuedToken.tokenType,
        expiresIn: issuedToken.expiresIn,
        scope: issuedToken.scopes,
      })
    },
  )

  return router
}
