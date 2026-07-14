import { AI_IDENTITY_CREDENTIAL_TYPE } from '../credentials/ai-identity.js'
import { agent } from '../veramo/agent.js'
import { run } from './run.js'

const includesCredentialType = (
  type: string | string[] | undefined,
  expectedType: string,
): boolean =>
  Array.isArray(type)
    ? type.includes(expectedType)
    : type === expectedType

await run(async () => {
  const storedCredentials =
    await agent.dataStoreORMGetVerifiableCredentials({})

  const aiIdentityCredentials = storedCredentials.filter(
    ({ verifiableCredential }) =>
      includesCredentialType(
        verifiableCredential.type,
        AI_IDENTITY_CREDENTIAL_TYPE,
      ),
  )

  if (aiIdentityCredentials.length === 0) {
    throw new Error(
      `No stored ${AI_IDENTITY_CREDENTIAL_TYPE} found`,
    )
  }

  const results = await Promise.all(
    aiIdentityCredentials.map(
      async ({ hash, verifiableCredential }) => {
        const verification = await agent.verifyCredential({
          credential: verifiableCredential,
        })

        return {
          credentialHash: hash,
          verified: verification.verified,
          error: verification.error?.message ?? null,
        }
      },
    ),
  )

  console.table(results)

  if (results.some(({ verified }) => !verified)) {
    throw new Error(
      'One or more AI identity credentials failed verification',
    )
  }
})
