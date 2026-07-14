import { AI_IDENTITY_CREDENTIAL_TYPE } from './ai-identity.js'
import {
  getCredentialIssuanceTime,
  hasCredentialSubject,
  hasCredentialType,
} from './utils.js'
import { agent } from '../veramo/agent.js'

export const getLatestAIIdentityCredential = async (
  subjectDid: string,
) => {
  const storedCredentials =
    await agent.dataStoreORMGetVerifiableCredentials({})

  const matchingCredentials = storedCredentials.filter(
    ({ verifiableCredential }) =>
      hasCredentialType(
        verifiableCredential,
        AI_IDENTITY_CREDENTIAL_TYPE,
      ) &&
      hasCredentialSubject(
        verifiableCredential,
        subjectDid,
      ),
  )

  if (matchingCredentials.length === 0) {
    throw new Error(
      `No ${AI_IDENTITY_CREDENTIAL_TYPE} found for ${subjectDid}`,
    )
  }

  return matchingCredentials.reduce((latest, current) =>
    getCredentialIssuanceTime(current.verifiableCredential) >
    getCredentialIssuanceTime(latest.verifiableCredential)
      ? current
      : latest,
  )
}
