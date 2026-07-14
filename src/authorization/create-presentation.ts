import type { VerifiablePresentation } from '@veramo/core'

import { getLatestAIIdentityCredential } from '../credentials/get-ai-identity.js'
import { agent } from '../veramo/agent.js'
import { getIdentity } from '../veramo/identities.js'
import type { IssuedAuthorizationChallenge } from './challenge.js'

export interface RobotAuthorizationPresentation {
  readonly credentialHash: string
  readonly presentation: VerifiablePresentation
}

export const createRobotAuthorizationPresentation = async (
  challenge: IssuedAuthorizationChallenge,
): Promise<RobotAuthorizationPresentation> => {
  const robot = await getIdentity('robot')

  const {
    hash: credentialHash,
    verifiableCredential,
  } = await getLatestAIIdentityCredential(robot.did)

  const presentation =
    await agent.createVerifiablePresentation({
      presentation: {
        holder: robot.did,
        verifiableCredential: [
          verifiableCredential,
        ],
      },
      proofFormat: 'jwt',
      challenge: challenge.challenge,
      domain: challenge.domain,
    })

  return {
    credentialHash,
    presentation,
  }
}
