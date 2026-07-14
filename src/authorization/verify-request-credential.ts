import type { VerifiableCredential } from '@veramo/core'
import { decodeCredentialToObject } from '@veramo/utils'

import { AI_IDENTITY_CREDENTIAL_TYPE } from '../credentials/ai-identity.js'
import {
  hasCredentialSubject,
  hasCredentialType,
} from '../credentials/utils.js'
import { agent } from '../veramo/agent.js'
import type {
  VerifiedAuthorizationRequest,
} from './verify-request-presentation.js'

export type CredentialVerificationErrorCode =
  | 'PRESENTATION_CREDENTIAL_MISSING'
  | 'AI_IDENTITY_CREDENTIAL_MISSING'
  | 'AI_IDENTITY_CREDENTIAL_COUNT_INVALID'
  | 'CREDENTIAL_VERIFICATION_FAILED'
  | 'CREDENTIAL_SUBJECT_MISMATCH'
  | 'CREDENTIAL_ISSUER_MISSING'

export class CredentialVerificationError extends Error {
  constructor(
    readonly code: CredentialVerificationErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'CredentialVerificationError'
  }
}

export interface VerifiedCredentialEvidence {
  readonly type: typeof AI_IDENTITY_CREDENTIAL_TYPE
  readonly issuerDid: string
  readonly subjectDid: string
  readonly credential: VerifiableCredential
}

export interface CredentialVerifiedAuthorizationRequest
  extends VerifiedAuthorizationRequest {
  readonly credentialVerified: true
  readonly credentialEvidence: VerifiedCredentialEvidence
}

const getIssuerDid = (
  credential: VerifiableCredential,
): string => {
  const { issuer } = credential

  if (typeof issuer === 'string') {
    return issuer
  }

  if (issuer?.id) {
    return issuer.id
  }

  throw new CredentialVerificationError(
    'CREDENTIAL_ISSUER_MISSING',
    'AI identity credential does not contain an issuer DID',
  )
}

export const verifyAuthorizationRequestCredential = async (
  verifiedRequest: VerifiedAuthorizationRequest,
): Promise<CredentialVerifiedAuthorizationRequest> => {
  const credentials = (
    verifiedRequest.request.presentation.verifiableCredential ?? []
  ).map(decodeCredentialToObject)

  if (credentials.length === 0) {
    throw new CredentialVerificationError(
      'PRESENTATION_CREDENTIAL_MISSING',
      'Authorization presentation does not contain a credential',
    )
  }

  const aiIdentityCredentials = credentials.filter(
    (credential) =>
      hasCredentialType(
        credential,
        AI_IDENTITY_CREDENTIAL_TYPE,
      ),
  )

  if (aiIdentityCredentials.length === 0) {
    throw new CredentialVerificationError(
      'AI_IDENTITY_CREDENTIAL_MISSING',
      `Presentation does not contain an ${AI_IDENTITY_CREDENTIAL_TYPE}`,
    )
  }

  if (aiIdentityCredentials.length !== 1) {
    throw new CredentialVerificationError(
      'AI_IDENTITY_CREDENTIAL_COUNT_INVALID',
      `Expected exactly one ${AI_IDENTITY_CREDENTIAL_TYPE}`,
    )
  }

  const [credential] = aiIdentityCredentials

  const verification = await agent.verifyCredential({
    credential,
  })

  if (!verification.verified) {
    throw new CredentialVerificationError(
      'CREDENTIAL_VERIFICATION_FAILED',
      verification.error?.message ??
        'AI identity credential verification failed',
    )
  }

  const actorDid = verifiedRequest.request.actorDid

  if (!hasCredentialSubject(credential, actorDid)) {
    throw new CredentialVerificationError(
      'CREDENTIAL_SUBJECT_MISMATCH',
      'AI identity credential subject does not match the requesting actor',
    )
  }

  return {
    ...verifiedRequest,
    credentialVerified: true,
    credentialEvidence: {
      type: AI_IDENTITY_CREDENTIAL_TYPE,
      issuerDid: getIssuerDid(credential),
      subjectDid: actorDid,
      credential,
    },
  }
}
