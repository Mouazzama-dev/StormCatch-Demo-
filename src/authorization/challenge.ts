interface AuthorizationChallengeBase {
  readonly requestId: string
  readonly challenge: string
  readonly domain: string
  readonly issuedAt: number
  readonly expiresAt: number
}

export interface IssuedAuthorizationChallenge
  extends AuthorizationChallengeBase {
  readonly status: 'issued'
}

export interface ConsumedAuthorizationChallenge
  extends AuthorizationChallengeBase {
  readonly status: 'consumed'
  readonly consumedAt: number
}

export interface ExpiredAuthorizationChallenge
  extends AuthorizationChallengeBase {
  readonly status: 'expired'
  readonly expiredAt: number
}

export type AuthorizationChallenge =
  | IssuedAuthorizationChallenge
  | ConsumedAuthorizationChallenge
  | ExpiredAuthorizationChallenge
