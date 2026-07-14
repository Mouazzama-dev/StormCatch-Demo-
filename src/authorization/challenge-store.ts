import type {
  AuthorizationChallenge,
  ConsumedAuthorizationChallenge,
  ExpiredAuthorizationChallenge,
  IssuedAuthorizationChallenge,
} from './challenge.js'

export type ChallengeStoreErrorCode =
  | 'CHALLENGE_ALREADY_EXISTS'
  | 'CHALLENGE_NOT_FOUND'
  | 'CHALLENGE_ALREADY_CONSUMED'
  | 'CHALLENGE_EXPIRED'

export class ChallengeStoreError extends Error {
  constructor(
    readonly code: ChallengeStoreErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'ChallengeStoreError'
  }
}

export class AuthorizationChallengeStore {
  private readonly challenges =
    new Map<string, AuthorizationChallenge>()

  save(challenge: IssuedAuthorizationChallenge): void {
    if (this.challenges.has(challenge.requestId)) {
      throw new ChallengeStoreError(
        'CHALLENGE_ALREADY_EXISTS',
        `Challenge already exists for request ${challenge.requestId}`,
      )
    }

    this.challenges.set(challenge.requestId, challenge)
  }

  get(
    requestId: string,
    now = Date.now(),
  ): AuthorizationChallenge {
    const challenge = this.challenges.get(requestId)

    if (!challenge) {
      throw new ChallengeStoreError(
        'CHALLENGE_NOT_FOUND',
        `Challenge not found for request ${requestId}`,
      )
    }

    if (
      challenge.status === 'issued' &&
      now >= challenge.expiresAt
    ) {
      const expiredChallenge: ExpiredAuthorizationChallenge = {
        ...challenge,
        status: 'expired',
        expiredAt: now,
      }

      this.challenges.set(requestId, expiredChallenge)

      return expiredChallenge
    }

    return challenge
  }

  consume(
    requestId: string,
    now = Date.now(),
  ): ConsumedAuthorizationChallenge {
    const challenge = this.get(requestId, now)

    if (challenge.status === 'consumed') {
      throw new ChallengeStoreError(
        'CHALLENGE_ALREADY_CONSUMED',
        `Challenge was already consumed for request ${requestId}`,
      )
    }

    if (challenge.status === 'expired') {
      throw new ChallengeStoreError(
        'CHALLENGE_EXPIRED',
        `Challenge expired for request ${requestId}`,
      )
    }

    const consumedChallenge: ConsumedAuthorizationChallenge = {
      ...challenge,
      status: 'consumed',
      consumedAt: now,
    }

    this.challenges.set(requestId, consumedChallenge)

    return consumedChallenge
  }
}

export const authorizationChallengeStore =
  new AuthorizationChallengeStore()
