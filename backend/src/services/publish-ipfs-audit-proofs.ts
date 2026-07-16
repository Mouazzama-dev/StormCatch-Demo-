import { randomUUID } from 'node:crypto'

import {
  auditRecordStore,
} from './audit-record-store.js'
import {
  uploadAuditRecordToIpfs,
} from './ipfs-audit-service.js'
import {
  ipfsProofStore,
  type StoredIpfsProof,
} from './ipfs-proof-store.js'

export interface PublishIpfsAuditProofsResult {
  readonly requestId: string
  readonly auditRecordCount: number
  readonly uploadedCount: number
  readonly existingCount: number
  readonly proofs: readonly StoredIpfsProof[]
}

export const publishAuditProofsToIpfs = async (
  requestId: string,
): Promise<PublishIpfsAuditProofsResult> => {
  const normalizedRequestId =
    requestId.trim()

  if (normalizedRequestId.length === 0) {
    throw new Error(
      'requestId is required',
    )
  }

  const auditRecords =
    await auditRecordStore.getByRequestId(
      normalizedRequestId,
    )

  if (auditRecords.length === 0) {
    throw new Error(
      `No audit records found for ${normalizedRequestId}`,
    )
  }

  const proofs: StoredIpfsProof[] = []

  let uploadedCount = 0
  let existingCount = 0

  for (const auditRecord of auditRecords) {
    const existingProof =
      await ipfsProofStore.getByEventId(
        auditRecord.eventId,
      )

    if (existingProof) {
      proofs.push(existingProof)
      existingCount += 1

      continue
    }

    const upload =
      await uploadAuditRecordToIpfs(
        auditRecord,
      )

    const proof: StoredIpfsProof = {
      schemaVersion: '1.0',
      proofId: randomUUID(),
      proofType: 'IPFS_AUDIT_PROOF',
      requestId:
        auditRecord.requestId,
      eventId:
        auditRecord.eventId,
      auditId:
        auditRecord.auditId,
      cid: upload.cid,
      fileId: upload.fileId,
      fileName: upload.fileName,
      size: upload.size,
      gatewayUrl: upload.gatewayUrl,
      uploadedAt: upload.uploadedAt,
      createdAt: new Date().toISOString(),
    }

    const storedProof =
      await ipfsProofStore.save(proof)

    proofs.push(storedProof)
    uploadedCount += 1
  }

  return {
    requestId: normalizedRequestId,
    auditRecordCount:
      auditRecords.length,
    uploadedCount,
    existingCount,
    proofs,
  }
}