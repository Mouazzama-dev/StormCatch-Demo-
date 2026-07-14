import {
  createAIIdentityCredentialPayload,
  type AIIdentityClaims,
} from '../credentials/ai-identity.js'
import { agent } from '../veramo/agent.js'
import { getIdentity } from '../veramo/identities.js'
import { run } from './run.js'

const claims: AIIdentityClaims = {
  agentId: 'robot-001',
  model: 'warehouse-robot-v1',
  manufacturer: 'StormCatch Integrator',
  capabilities: [
    'navigate',
    'scan-inventory',
    'move-container',
  ],
}

await run(async () => {
  const [integrator, robot] = await Promise.all([
    getIdentity('integrator'),
    getIdentity('robot'),
  ])

  const credential = await agent.createVerifiableCredential({
    credential: createAIIdentityCredentialPayload({
      issuerDid: integrator.did,
      subjectDid: robot.did,
      claims,
    }),
    proofFormat: 'jwt',
  })

  const credentialHash =
    await agent.dataStoreSaveVerifiableCredential({
      verifiableCredential: credential,
    })

  console.log({
    credentialType: 'AIIdentityCredential',
    proofFormat: 'jwt',
    issuerDid: integrator.did,
    subjectDid: robot.did,
    credentialHash,
  })
})
