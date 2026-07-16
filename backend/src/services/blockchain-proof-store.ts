import {
  appendFile,
  mkdir,
  readFile,
} from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface StoredBlockchainProof {
  readonly schemaVersion: '1.0'
  readonly proofId: string
  readonly proofType: 'SEPOLIA_AUDIT_ANCHOR'
  readonly requestId: string
  readonly eventId: string
  readonly auditId: string
  readonly cid: string
  readonly eventKey: string
  readonly auditHash: string
  readonly contractAddress: string
  readonly chainId: number
  readonly status:
    | 'ANCHORED'
    | 'ALREADY_ANCHORED'
  readonly transactionHash: string | null
  readonly blockNumber: number | null
  readonly gasUsed: string | null
  readonly createdAt: string
}

const defaultLogPath = fileURLToPath(
  new URL(
    '../../data/blockchain-audit-proofs.jsonl',
    import.meta.url,
  ),
)

class BlockchainProofStore {
  private writeSequence: Promise<void> =
    Promise.resolve()

  constructor(
    private readonly logPath: string =
      defaultLogPath,
  ) {}

  async save(
    proof: StoredBlockchainProof,
  ): Promise<StoredBlockchainProof> {
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

  async getByEventId(
    eventId: string,
  ): Promise<
    StoredBlockchainProof | undefined
  > {
    await this.writeSequence

    const records =
      await this.readAll()

    return records.find(
      (record) =>
        record.eventId === eventId,
    )
  }

  async getByRequestId(
    requestId: string,
  ): Promise<StoredBlockchainProof[]> {
    await this.writeSequence

    const records =
      await this.readAll()

    return records.filter(
      (record) =>
        record.requestId === requestId,
    )
  }

  private async readAll(): Promise<
    StoredBlockchainProof[]
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
          ) as StoredBlockchainProof,
      )
  }
}

export const blockchainProofStore =
  new BlockchainProofStore()
