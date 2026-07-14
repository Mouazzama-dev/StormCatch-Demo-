import type { VerifiableCredential } from '@veramo/core'

export const hasCredentialType = (
  credential: VerifiableCredential,
  expectedType: string,
): boolean => {
  const { type } = credential

  return Array.isArray(type)
    ? type.includes(expectedType)
    : type === expectedType
}

export const hasCredentialSubject = (
  credential: VerifiableCredential,
  subjectDid: string,
): boolean => {
  const subjects = Array.isArray(credential.credentialSubject)
    ? credential.credentialSubject
    : [credential.credentialSubject]

  return subjects.some(({ id }) => id === subjectDid)
}

export const getCredentialIssuanceTime = (
  credential: VerifiableCredential,
): number => {
  const { issuanceDate } = credential

  if (!issuanceDate) {
    return 0
  }

  const timestamp = Date.parse(issuanceDate)

  return Number.isNaN(timestamp) ? 0 : timestamp
}
