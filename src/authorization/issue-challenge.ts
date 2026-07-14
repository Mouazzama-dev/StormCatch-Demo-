import type { IssuedAuthorizationChallenge } from './challenge.js'
import {
  AuthorizationChallengeStore,
  authorizationChallengeStore,
} from './challenge-store.js'
import { createAuthorizationChallenge } from './create-challenge.js'

interface IssueAuthorizationChallengeOptions {
  readonly now?: number
  readonly store?: AuthorizationChallengeStore
}

export const issueAuthorizationChallenge = ({
  now = Date.now(),
  store = authorizationChallengeStore,
}: IssueAuthorizationChallengeOptions = {}): IssuedAuthorizationChallenge => {
  const challenge = createAuthorizationChallenge(now)

  store.save(challenge)

  return challenge
}
