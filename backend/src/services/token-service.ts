import { randomUUID } from 'node:crypto'

import {
  SignJWT,
  jwtVerify,
} from 'jose'

import {
  authConfig,
  authScopes,
  type AuthScope,
} from '../config/auth.js'

interface IssueAccessTokenArgs {
  readonly clientId: string
  readonly scopes: readonly AuthScope[]
}

export interface IssuedAccessToken {
  readonly token: string
  readonly tokenType: 'Bearer'
  readonly expiresIn: number
  readonly scopes: readonly AuthScope[]
}

export interface VerifiedAccessToken {
  readonly clientId: string
  readonly tokenId: string
  readonly scopes: readonly AuthScope[]
  readonly issuedAt: number
  readonly expiresAt: number
}

const isAuthScope = (
  value: unknown,
): value is AuthScope =>
  typeof value === 'string' &&
  authScopes.some((scope) => scope === value)

const parseScopes = (
  value: unknown,
): AuthScope[] => {
  if (
    !Array.isArray(value) ||
    !value.every(isAuthScope)
  ) {
    throw new Error(
      'Access token contains invalid scopes',
    )
  }

  return value
}

export const issueAccessToken = async ({
  clientId,
  scopes,
}: IssueAccessTokenArgs): Promise<IssuedAccessToken> => {
  const issuedAt = Math.floor(Date.now() / 1_000)
  const expiresAt =
    issuedAt + authConfig.tokenTtlSeconds

  const token = await new SignJWT({
    scope: [...scopes],
  })
    .setProtectedHeader({
      alg: authConfig.algorithm,
      typ: 'JWT',
    })
    .setIssuer(authConfig.issuer)
    .setAudience(authConfig.audience)
    .setSubject(clientId)
    .setJti(randomUUID())
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(authConfig.signingKey)

  return {
    token,
    tokenType: 'Bearer',
    expiresIn: authConfig.tokenTtlSeconds,
    scopes: [...scopes],
  }
}

export const verifyAccessToken = async (
  token: string,
): Promise<VerifiedAccessToken> => {
  const {
    payload,
    protectedHeader,
  } = await jwtVerify(
    token,
    authConfig.signingKey,
    {
      issuer: authConfig.issuer,
      audience: authConfig.audience,
      algorithms: [authConfig.algorithm],
    },
  )

  if (protectedHeader.typ !== 'JWT') {
    throw new Error(
      'Access token has an invalid type',
    )
  }

  if (
    !payload.sub ||
    !payload.jti ||
    payload.iat === undefined ||
    payload.exp === undefined
  ) {
    throw new Error(
      'Access token is missing required claims',
    )
  }

  return {
    clientId: payload.sub,
    tokenId: payload.jti,
    scopes: parseScopes(payload.scope),
    issuedAt: payload.iat,
    expiresAt: payload.exp,
  }
}
