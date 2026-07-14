import { randomBytes, randomUUID } from 'node:crypto'

import { authorizationConfig } from '../config/authorization.js'
import type { IssuedAuthorizationChallenge } from './challenge.js'

export const createAuthorizationChallenge = (
  now = Date.now(),
): IssuedAuthorizationChallenge => ({
  requestId: randomUUID(),
  challenge: randomBytes(
    authorizationConfig.challengeByteLength,
  ).toString('base64url'),
  domain: authorizationConfig.domain,
  issuedAt: now,
  expiresAt: now + authorizationConfig.challengeTtlMs,
  status: 'issued',
})
