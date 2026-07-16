import { PinataSDK } from 'pinata'

import type {
  StoredAuditRecord,
} from './audit-record-store.js'

export interface IpfsAuditProof {
  readonly schemaVersion: '1.0'
  readonly proofType: 'AUTHORIZATION_AUDIT_PROOF'
  readonly auditId: string
  readonly eventId: string
  readonly requestId: string
  readonly algorithm: 'SHA-256'
  readonly hash: string
  readonly authorizationEvent: unknown
  readonly createdAt: string
}

export interface IpfsAuditUploadResult {
  readonly cid: string
  readonly fileId: string
  readonly fileName: string
  readonly size: number
  readonly uploadedAt: string
  readonly gatewayUrl: string
}

const requireEnvironmentVariable = (
  name: 'PINATA_JWT' | 'PINATA_GATEWAY_URL',
): string => {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(
      `${name} environment variable is required`,
    )
  }

  return value
}

const normalizeGatewayDomain = (
  value: string,
): string =>
  value
    .replace(/^https?:\/\//u, '')
    .replace(/\/+$/u, '')

const pinataJwt =
  requireEnvironmentVariable('PINATA_JWT')

const gatewayDomain =
  normalizeGatewayDomain(
    requireEnvironmentVariable(
      'PINATA_GATEWAY_URL',
    ),
  )

const pinata = new PinataSDK({
  pinataJwt,
  pinataGateway: gatewayDomain,
})

const parseCanonicalJson = (
  canonicalJson: string,
): unknown => {
  try {
    return JSON.parse(canonicalJson)
  } catch (error: unknown) {
    throw new Error(
      'Audit record contains invalid canonical JSON',
      {
        cause: error,
      },
    )
  }
}

export const uploadAuditRecordToIpfs = async (
  auditRecord: StoredAuditRecord,
): Promise<IpfsAuditUploadResult> => {
  const authorizationEvent =
    parseCanonicalJson(
      auditRecord.canonicalJson,
    )

  const proof: IpfsAuditProof = {
    schemaVersion: '1.0',
    proofType:
      'AUTHORIZATION_AUDIT_PROOF',
    auditId: auditRecord.auditId,
    eventId: auditRecord.eventId,
    requestId: auditRecord.requestId,
    algorithm: auditRecord.algorithm,
    hash: auditRecord.hash,
    authorizationEvent,
    createdAt: auditRecord.createdAt,
  }

  const fileName =
    `stormcatch-audit-${auditRecord.eventId}.json`

  const upload =
    await pinata.upload.public
      .json(proof)
      .name(fileName)
      .keyvalues({
        application: 'stormcatch',
        requestId:
          auditRecord.requestId,
        eventId:
          auditRecord.eventId,
        auditId:
          auditRecord.auditId,
      })

  return {
    cid: upload.cid,
    fileId: upload.id,
    fileName,
    size: upload.size,
    uploadedAt: upload.created_at,
    gatewayUrl:
      `https://${gatewayDomain}/ipfs/${upload.cid}`,
  }
}