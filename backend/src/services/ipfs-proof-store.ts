import {
  appendFile,
  mkdir,
  readFile,
} from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface StoredIpfsProof {
  readonly schemaVersion: '1.0'
  readonly proofId: string
  readonly proofType: 'IPFS_AUDIT_PROOF'
  readonly requestId: string
  readonly eventId: string
  readonly auditId: string
  readonly cid: string
  readonly fileId: string
  readonly fileName: string
  readonly size: number
  readonly gatewayUrl: string
  readonly uploadedAt: string
  readonly createdAt: string
}

const defaultLogPath = fileURLToPath(
  new URL(
    '../../data/ipfs-audit-proofs.jsonl',
    import.meta.url,
  ),
)

class IpfsProofStore {
  private writeSequence: Promise<void> =
    Promise.resolve()

  constructor(
    private readonly logPath: string =
      defaultLogPath,
  ) {}

  async save(
    proof: StoredIpfsProof,
  ): Promise<StoredIpfsProof> {
    const operation =
      this.writeSequence.then(async () => {
        await mkdir(
          dirname(this.logPath),
          {
            recursive: true,
          },
        )

        const records =
          await this.readAll()

        const existingProof =
          records.find(
            (record) =>
              record.eventId ===
              proof.eventId,
          )

        if (existingProof) {
          return existingProof
        }

        await appendFile(
          this.logPath,
          `${JSON.stringify(proof)}\n`,
          {
            encoding: 'utf8',
            flag: 'a',
          },
        )

        return proof
      })

    this.writeSequence =
      operation.then(
        () => undefined,
        () => undefined,
      )

    return operation
  }

  async getByRequestId(
    requestId: string,
  ): Promise<StoredIpfsProof[]> {
    await this.writeSequence

    const records =
      await this.readAll()

    return records.filter(
      (record) =>
        record.requestId === requestId,
    )
  }

  async getByEventId(
    eventId: string,
  ): Promise<StoredIpfsProof | undefined> {
    await this.writeSequence

    const records =
      await this.readAll()

    return records.find(
      (record) =>
        record.eventId === eventId,
    )
  }

  private async readAll(): Promise<
    StoredIpfsProof[]
  > {
    let contents: string

    try {
      contents = await readFile(
        this.logPath,
        'utf8',
      )
    } catch (error: unknown) {
      const fileError =
        error as NodeJS.ErrnoException

      if (fileError.code === 'ENOENT') {
        return []
      }

      throw error
    }

    return contents
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map(
        (line) =>
          JSON.parse(
            line,
          ) as StoredIpfsProof,
      )
  }
}

export const ipfsProofStore =
  new IpfsProofStore()