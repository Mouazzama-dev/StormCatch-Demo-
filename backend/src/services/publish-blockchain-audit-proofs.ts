import { randomUUID } from 'node:crypto'

import {
  auditRecordStore,
} from './audit-record-store.js'
import {
  anchorAuditProofOnSepolia,
} from './blockchain-anchor-service.js'
import {
  blockchainProofStore,
  type StoredBlockchainProof,
} from './blockchain-proof-store.js'
import {
  publishAuditProofsToIpfs,
} from './publish-ipfs-audit-proofs.js'

export interface PublishBlockchainProofsResult {
  readonly requestId: string
  readonly auditRecordCount: number
  readonly ipfsProofCount: number
  readonly anchoredCount: number
  readonly existingCount: number
  readonly proofs:
    readonly StoredBlockchainProof[]
}

export const publishAuditProofsToBlockchain =
  async (
    requestId: string,
  ): Promise<PublishBlockchainProofsResult> => {
    const normalizedRequestId =
      requestId.trim()

    if (normalizedRequestId.length === 0) {
      throw new Error(
        'requestId is required',
      )
    }

    /*
     * Ensure every audit event has an IPFS CID
     * before attempting blockchain anchoring.
     */
    const ipfsPublishResult =
      await publishAuditProofsToIpfs(
        normalizedRequestId,
      )

    const auditRecords =
      await auditRecordStore.getByRequestId(
        normalizedRequestId,
      )

    const proofs: StoredBlockchainProof[] = []

    let anchoredCount = 0
    let existingCount = 0

    for (
      const ipfsProof of
        ipfsPublishResult.proofs
    ) {
      const existingProof =
        await blockchainProofStore
          .getByEventId(
            ipfsProof.eventId,
          )

      if (existingProof) {
        proofs.push(existingProof)
        existingCount += 1

        continue
      }

      const auditRecord =
        auditRecords.find(
          (record) =>
            record.eventId ===
            ipfsProof.eventId,
        )

      if (!auditRecord) {
        throw new Error(
          `No audit record found for event ${ipfsProof.eventId}`,
        )
      }

      const anchorResult =
        await anchorAuditProofOnSepolia({
          eventId:
            ipfsProof.eventId,
          auditHash:
            auditRecord.hash,
          cid:
            ipfsProof.cid,
        })

      const proof: StoredBlockchainProof = {
        schemaVersion: '1.0',
        proofId: randomUUID(),
        proofType:
          'SEPOLIA_AUDIT_ANCHOR',
        requestId:
          normalizedRequestId,
        eventId:
          ipfsProof.eventId,
        auditId:
          ipfsProof.auditId,
        cid:
          ipfsProof.cid,
        eventKey:
          anchorResult.eventKey,
        auditHash:
          anchorResult.auditHash,
        contractAddress:
          anchorResult.contractAddress,
        chainId:
          anchorResult.chainId,
        status:
          anchorResult.status,
        transactionHash:
          anchorResult.transactionHash,
        blockNumber:
          anchorResult.blockNumber,
        gasUsed:
          anchorResult.gasUsed,
        createdAt:
          new Date().toISOString(),
      }

      const storedProof =
        await blockchainProofStore.save(
          proof,
        )

      proofs.push(storedProof)

      if (
        anchorResult.status === 'ANCHORED'
      ) {
        anchoredCount += 1
      } else {
        existingCount += 1
      }
    }

    return {
      requestId:
        normalizedRequestId,
      auditRecordCount:
        auditRecords.length,
      ipfsProofCount:
        ipfsPublishResult.proofs.length,
      anchoredCount,
      existingCount,
      proofs,
    }
  }