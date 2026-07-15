import {
  appendFile,
  mkdir,
  readFile,
} from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  type AuthorizationAction,
  type AuthorizationResource,
} from '../../../src/authorization/request.js'

export interface StoredAuthorizationResult {
  readonly schemaVersion: '1.0'
  readonly requestId: string
  readonly status: 'completed'
  readonly decision: 'APPROVE' | 'REJECT'
  readonly reason: string
  readonly details?: string
  readonly actorDid: string
  readonly resource: AuthorizationResource
  readonly action: AuthorizationAction
  readonly verification: {
    readonly tokenVerified: true
    readonly presentationVerified: boolean
    readonly credentialVerified: boolean
    readonly challengeConsumed: boolean
  }
  readonly policy: {
    readonly id: string
    readonly permitted: boolean
  } | null
  readonly credential: {
    readonly type: string
    readonly issuerDid: string
    readonly subjectDid: string
  } | null
  readonly createdAt: string
}

type StoreErrorCode =
  | 'INVALID_LOG_ENTRY'
  | 'LOG_READ_FAILED'
  | 'LOG_WRITE_FAILED'

export class AuthorizationResultStoreError
  extends Error {
  constructor(
    readonly code: StoreErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'AuthorizationResultStoreError'
  }
}

const defaultLogPath = fileURLToPath(
  new URL(
    '../../data/authorization-decisions.jsonl',
    import.meta.url,
  ),
)

const isObject = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value)

const parseLogEntry = (
  line: string,
  lineNumber: number,
): StoredAuthorizationResult => {
  let value: unknown

  try {
    value = JSON.parse(line)
  } catch (error: unknown) {
    throw new AuthorizationResultStoreError(
      'INVALID_LOG_ENTRY',
      `Invalid JSON at log line ${lineNumber}`,
      error,
    )
  }

  if (
    !isObject(value) ||
    typeof value.requestId !== 'string' ||
    typeof value.createdAt !== 'string' ||
    (
      value.decision !== 'APPROVE' &&
      value.decision !== 'REJECT'
    )
  ) {
    throw new AuthorizationResultStoreError(
      'INVALID_LOG_ENTRY',
      `Invalid authorization record at log line ${lineNumber}`,
    )
  }

  return value as unknown as StoredAuthorizationResult
}

class AuthorizationResultStore {
  private writeSequence: Promise<void> =
    Promise.resolve()

  constructor(
    private readonly logPath: string =
      defaultLogPath,
  ) {}

  async save(
    result: StoredAuthorizationResult,
  ): Promise<void> {
    const operation = this.writeSequence.then(
      async () => {
        try {
          await mkdir(
            dirname(this.logPath),
            {
              recursive: true,
            },
          )

          const existingRecords =
            await this.readAllFromDisk()

          const alreadySaved =
            existingRecords.some(
              ({ requestId }) =>
                requestId === result.requestId,
            )

          if (alreadySaved) {
            return
          }

          await appendFile(
            this.logPath,
            `${JSON.stringify(result)}\n`,
            {
              encoding: 'utf8',
              flag: 'a',
            },
          )
        } catch (error: unknown) {
          if (
            error instanceof
            AuthorizationResultStoreError
          ) {
            throw error
          }

          throw new AuthorizationResultStoreError(
            'LOG_WRITE_FAILED',
            'Unable to write the authorization log',
            error,
          )
        }
      },
    )

    this.writeSequence = operation.catch(
      () => undefined,
    )

    await operation
  }

  async get(
    requestId: string,
  ): Promise<
    StoredAuthorizationResult | undefined
  > {
    await this.writeSequence

    const records =
      await this.readAllFromDisk()

    for (
      let index = records.length - 1;
      index >= 0;
      index -= 1
    ) {
      if (
        records[index]?.requestId === requestId
      ) {
        return records[index]
      }
    }

    return undefined
  }

  private async readAllFromDisk(): Promise<
    StoredAuthorizationResult[]
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

      throw new AuthorizationResultStoreError(
        'LOG_READ_FAILED',
        'Unable to read the authorization log',
        error,
      )
    }

    return contents
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line, index) =>
        parseLogEntry(line, index + 1),
      )
  }
}

export const authorizationResultStore =
  new AuthorizationResultStore()
