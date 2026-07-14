import { resolve } from 'node:path'

type RequiredEnvironmentVariable =
  | 'KMS_SECRET_KEY'
  | 'SEPOLIA_RPC_URL'

const requireEnvironmentVariable = (
  name: RequiredEnvironmentVariable,
): string => {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

const kmsSecretKey = requireEnvironmentVariable('KMS_SECRET_KEY')
const sepoliaRpcUrl = requireEnvironmentVariable('SEPOLIA_RPC_URL')

if (!/^[0-9a-f]{64}$/i.test(kmsSecretKey)) {
  throw new Error('KMS_SECRET_KEY must be a 64-character hexadecimal value')
}

try {
  new URL(sepoliaRpcUrl)
} catch {
  throw new Error('SEPOLIA_RPC_URL must be a valid URL')
}

export const environment = Object.freeze({
  kmsSecretKey,
  sepoliaRpcUrl,
  databaseFile: resolve('data/veramo.sqlite'),
  network: 'sepolia',
  didProvider: 'did:ethr:sepolia',
} as const)
