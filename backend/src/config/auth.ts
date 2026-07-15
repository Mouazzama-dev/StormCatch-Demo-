export const authScopes = [
  'robot:read',
  'challenge:create',
  'presentation:create',
  'authorization:submit',
  'authorization:read',
  'audit:read',
] as const

export type AuthScope =
  (typeof authScopes)[number]

type AuthEnvironmentVariable =
  | 'JWT_SIGNING_SECRET'
  | 'JWT_TOKEN_TTL_SECONDS'
  | 'DEMO_CLIENT_ID'
  | 'DEMO_CLIENT_SECRET'

const requireEnvironmentVariable = (
  name: AuthEnvironmentVariable,
): string => {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`,
    )
  }

  return value
}

const parsePositiveInteger = (
  name: AuthEnvironmentVariable,
  value: string,
): number => {
  const parsedValue = Number(value)

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue <= 0
  ) {
    throw new Error(
      `${name} must be a positive integer`,
    )
  }

  return parsedValue
}

const jwtSigningSecret =
  requireEnvironmentVariable('JWT_SIGNING_SECRET')

const signingKey = Buffer.from(
  jwtSigningSecret,
  'base64url',
)

if (signingKey.byteLength < 32) {
  throw new Error(
    'JWT_SIGNING_SECRET must contain at least 256 bits of entropy',
  )
}

const clientId =
  requireEnvironmentVariable('DEMO_CLIENT_ID')

const clientSecret =
  requireEnvironmentVariable('DEMO_CLIENT_SECRET')

if (clientSecret.length < 24) {
  throw new Error(
    'DEMO_CLIENT_SECRET must contain at least 24 characters',
  )
}

const tokenTtlSeconds = parsePositiveInteger(
  'JWT_TOKEN_TTL_SECONDS',
  requireEnvironmentVariable(
    'JWT_TOKEN_TTL_SECONDS',
  ),
)

export const authConfig = Object.freeze({
  issuer: 'stormcatch-authorization-api',
  audience: 'stormcatch-api',
  algorithm: 'HS256',
  tokenTtlSeconds,
  signingKey,
  client: Object.freeze({
    id: clientId,
    secret: clientSecret,
    scopes: authScopes,
  }),
} as const)
