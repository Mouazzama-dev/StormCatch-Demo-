import {
  appendFile,
  mkdir,
  readFile,
} from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface StoredAuditRecord {
  readonly schemaVersion: '1.0'
  readonly auditId: string
  readonly eventType: 'AUTHORIZATION_AUDIT_DIGEST'
  readonly eventId: string
  readonly requestId: string
  readonly algorithm: 'SHA-256'
  readonly hash: string
  readonly canonicalJson: string
  readonly createdAt: string
}

const defaultAuditLogPath = fileURLToPath(
  new URL(
    '../../data/authorization-audits.jsonl',
    import.meta.url,
  ),
)

class AuditRecordStore {
  private writeSequence: Promise<void> =
    Promise.resolve()

  constructor(
    private readonly logPath: string =
      defaultAuditLogPath,
  ) {}

  async save(
    record: StoredAuditRecord,
  ): Promise<void> {
    const operation =
      this.writeSequence.then(async () => {
        await mkdir(
          dirname(this.logPath),
          {
            recursive: true,
          },
        )

        const existingRecords =
          await this.readAll()

        const alreadySaved =
          existingRecords.some(
            ({ eventId }) =>
              eventId === record.eventId,
          )

        if (alreadySaved) {
          return
        }

        await appendFile(
          this.logPath,
          `${JSON.stringify(record)}\n`,
          {
            encoding: 'utf8',
            flag: 'a',
          },
        )
      })

    this.writeSequence =
      operation.catch(() => undefined)

    await operation
  }

  async getByRequestId(
    requestId: string,
  ): Promise<StoredAuditRecord[]> {
    await this.writeSequence

    const records = await this.readAll()

    return records.filter(
      (record) =>
        record.requestId === requestId,
    )
  }

  private async readAll(): Promise<
    StoredAuditRecord[]
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
          ) as StoredAuditRecord,
      )
  }
}

export const auditRecordStore =
  new AuditRecordStore()
