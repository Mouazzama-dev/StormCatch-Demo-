import type {
  RequestHandler,
} from 'express'

import type {
  AuthScope,
} from '../config/auth.js'
import {
  verifyAccessToken,
  type VerifiedAccessToken,
} from '../services/token-service.js'

interface AuthenticationLocals {
  auth: VerifiedAccessToken
}

interface AuthenticationErrorResponse {
  readonly error: string
  readonly message: string
}

const unauthorizedResponse =
  'Bearer realm="stormcatch-api"'

const getBearerToken = (
  authorizationHeader: string | undefined,
): string | null => {
  if (!authorizationHeader) {
    return null
  }

  const parts = authorizationHeader
    .trim()
    .split(/\s+/)

  if (
    parts.length !== 2 ||
    parts[0]?.toLowerCase() !== 'bearer' ||
    !parts[1]
  ) {
    return null
  }

  return parts[1]
}

export const requireAccessToken = (
  requiredScope?: AuthScope,
): RequestHandler<
  Record<string, string>,
  unknown | AuthenticationErrorResponse,
  unknown,
  Record<string, never>,
  AuthenticationLocals
> =>
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const token = getBearerToken(
      request.header('authorization'),
    )

    if (!token) {
      response.set(
        'WWW-Authenticate',
        unauthorizedResponse,
      )

      response.status(401).json({
        error: 'ACCESS_TOKEN_REQUIRED',
        message:
          'A valid Bearer access token is required',
      })

      return
    }

    try {
      const verifiedToken =
        await verifyAccessToken(token)

      if (
        requiredScope &&
        !verifiedToken.scopes.includes(
          requiredScope,
        )
      ) {
        response.set(
          'WWW-Authenticate',
          `Bearer error="insufficient_scope", scope="${requiredScope}"`,
        )

        response.status(403).json({
          error: 'INSUFFICIENT_SCOPE',
          message:
            `Access token requires the ${requiredScope} scope`,
        })

        return
      }

      response.locals.auth = verifiedToken

      next()
    } catch {
      response.set(
        'WWW-Authenticate',
        unauthorizedResponse,
      )

      response.status(401).json({
        error: 'INVALID_ACCESS_TOKEN',
        message:
          'The access token is invalid or expired',
      })
    }
  }
