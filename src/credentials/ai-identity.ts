import type { CredentialPayload } from '@veramo/core'

export const AI_IDENTITY_CREDENTIAL_TYPE =
  'AIIdentityCredential' as const

export interface AIIdentityClaims {
  agentId: string
  model: string
  manufacturer: string
  capabilities: string[]
}

interface CreateAIIdentityCredentialPayloadArgs {
  issuerDid: string
  subjectDid: string
  claims: AIIdentityClaims
}

export const createAIIdentityCredentialPayload = ({
  issuerDid,
  subjectDid,
  claims,
}: CreateAIIdentityCredentialPayloadArgs): CredentialPayload => ({
  issuer: {
    id: issuerDid,
  },
  type: [
    'VerifiableCredential',
    AI_IDENTITY_CREDENTIAL_TYPE,
  ],
  credentialSubject: {
    id: subjectDid,
    ...claims,
  },
})
