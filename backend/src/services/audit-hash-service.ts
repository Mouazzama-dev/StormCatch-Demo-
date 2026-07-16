import { createHash } from 'node:crypto'

import type {
  StoredAuthorizationResult,
} from './authorization-result-store.js'

export interface AuthorizationAuditDigest {
  readonly algorithm: 'SHA-256'
  readonly hash: string
  readonly canonicalJson: string
}

const serializeString = (
  value: string,
): string => {
  const serialized = JSON.stringify(value)

  if (serialized === undefined) {
    throw new TypeError(
      'Unable to serialize string value',
    )
  }

  return serialized
}

const canonicalizeValue = (
  value: unknown,
): string => {
  if (value === null) {
    return 'null'
  }

  if (typeof value === 'string') {
    return serializeString(value)
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(
        'Canonical JSON does not support non-finite numbers',
      )
    }

    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    const items = value.map(
      (item) => canonicalizeValue(item),
    )

    return `[${items.join(',')}]`
  }

  if (
    typeof value === 'object' &&
    value !== null
  ) {
    const record =
      value as Record<string, unknown>

    const properties = Object.keys(record)
      .filter(
        (key) =>
          record[key] !== undefined,
      )
      .sort()
      .map((key) => {
        const serializedKey =
          serializeString(key)

        const serializedValue =
          canonicalizeValue(record[key])

        return `${serializedKey}:${serializedValue}`
      })

    return `{${properties.join(',')}}`
  }

  throw new TypeError(
    `Unsupported canonical JSON value: ${typeof value}`,
  )
}

export const createAuthorizationAuditDigest = (
  event: StoredAuthorizationResult,
): AuthorizationAuditDigest => {
  const canonicalJson =
    canonicalizeValue(event)

  const digest = createHash('sha256')
    .update(canonicalJson, 'utf8')
    .digest('hex')

  return {
    algorithm: 'SHA-256',
    hash: `sha256:${digest}`,
    canonicalJson,
  }
}
