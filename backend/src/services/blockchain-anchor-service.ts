import {
  Contract,
  JsonRpcProvider,
  Wallet,
  getAddress,
  isHexString,
  keccak256,
  toUtf8Bytes,
} from 'ethers'

interface AnchorAuditProofInput {
  readonly eventId: string
  readonly auditHash: string
  readonly cid: string
}

export interface BlockchainAnchorResult {
  readonly status:
    | 'ANCHORED'
    | 'ALREADY_ANCHORED'
  readonly eventId: string
  readonly eventKey: string
  readonly auditHash: string
  readonly cid: string
  readonly contractAddress: string
  readonly chainId: number
  readonly transactionHash: string | null
  readonly blockNumber: number | null
  readonly gasUsed: string | null
}

type RequiredEnvironmentVariable =
  | 'SEPOLIA_RPC_URL'
  | 'SEPOLIA_DEPLOYER_PRIVATE_KEY'
  | 'AUDIT_ANCHORER_ADDRESS'
  | 'AUDIT_ANCHOR_CONTRACT_ADDRESS'
  | 'SEPOLIA_CHAIN_ID'

const auditAnchorAbi = [
  'function anchorAudit(bytes32 eventKey, bytes32 auditHash, string ipfsCid)',
  'function isAnchored(bytes32 eventKey) view returns (bool)',
  'function getAnchor(bytes32 eventKey) view returns (bytes32 auditHash, string ipfsCid, address submitter, uint64 anchoredAt, bool exists)',
] as const

const requireEnvironmentVariable = (
  name: RequiredEnvironmentVariable,
): string => {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(
      `${name} environment variable is required`,
    )
  }

  return value
}

const normalizeAuditHash = (
  auditHash: string,
): string => {
  const normalized =
    auditHash.startsWith('sha256:')
      ? auditHash.slice('sha256:'.length)
      : auditHash

  const hexadecimalHash =
    normalized.startsWith('0x')
      ? normalized
      : `0x${normalized}`

  if (
    !isHexString(
      hexadecimalHash,
      32,
    )
  ) {
    throw new Error(
      'Audit hash must contain exactly 32 bytes',
    )
  }

  return hexadecimalHash
}

const createEventKey = (
  eventId: string,
): string =>
  keccak256(
    toUtf8Bytes(eventId),
  )

export const anchorAuditProofOnSepolia =
  async (
    input: AnchorAuditProofInput,
  ): Promise<BlockchainAnchorResult> => {
    const eventId = input.eventId.trim()
    const cid = input.cid.trim()

    if (eventId.length === 0) {
      throw new Error(
        'eventId is required',
      )
    }

    if (cid.length === 0) {
      throw new Error(
        'IPFS CID is required',
      )
    }

    const rpcUrl =
      requireEnvironmentVariable(
        'SEPOLIA_RPC_URL',
      )

    const privateKey =
      requireEnvironmentVariable(
        'SEPOLIA_DEPLOYER_PRIVATE_KEY',
      )

    const configuredAnchorer =
      getAddress(
        requireEnvironmentVariable(
          'AUDIT_ANCHORER_ADDRESS',
        ),
      )

    const contractAddress =
      getAddress(
        requireEnvironmentVariable(
          'AUDIT_ANCHOR_CONTRACT_ADDRESS',
        ),
      )

    const configuredChainId =
      Number.parseInt(
        requireEnvironmentVariable(
          'SEPOLIA_CHAIN_ID',
        ),
        10,
      )

    if (
      !Number.isSafeInteger(
        configuredChainId,
      )
    ) {
      throw new Error(
        'SEPOLIA_CHAIN_ID is invalid',
      )
    }

    const provider =
      new JsonRpcProvider(rpcUrl)

    const network =
      await provider.getNetwork()

    if (
      network.chainId !==
      BigInt(configuredChainId)
    ) {
      throw new Error(
        `Unexpected network chain ID: ${network.chainId}`,
      )
    }

    const wallet =
      new Wallet(
        privateKey,
        provider,
      )

    const walletAddress =
      getAddress(wallet.address)

    if (
      walletAddress !==
      configuredAnchorer
    ) {
      throw new Error(
        'Deployment wallet does not match AUDIT_ANCHORER_ADDRESS',
      )
    }

    const auditHash =
      normalizeAuditHash(
        input.auditHash,
      )

    const eventKey =
      createEventKey(eventId)

    const contract =
      new Contract(
        contractAddress,
        auditAnchorAbi,
        wallet,
      )

    const alreadyAnchored =
      await contract.isAnchored(
        eventKey,
      ) as boolean

    if (alreadyAnchored) {
      const storedAnchor =
        await contract.getAnchor(
          eventKey,
        ) as unknown as readonly [
          string,
          string,
          string,
          bigint,
          boolean,
        ]

      const storedAuditHash =
        storedAnchor[0]

      const storedCid =
        storedAnchor[1]

      if (
        storedAuditHash.toLowerCase() !==
          auditHash.toLowerCase() ||
        storedCid !== cid
      ) {
        throw new Error(
          'Blockchain event key already contains different audit data',
        )
      }

      return {
        status: 'ALREADY_ANCHORED',
        eventId,
        eventKey,
        auditHash,
        cid,
        contractAddress,
        chainId: configuredChainId,
        transactionHash: null,
        blockNumber: null,
        gasUsed: null,
      }
    }

    const transaction =
      await contract.anchorAudit(
        eventKey,
        auditHash,
        cid,
      )

    const receipt =
      await transaction.wait()

    if (!receipt) {
      throw new Error(
        'Blockchain transaction was not mined',
      )
    }

    return {
      status: 'ANCHORED',
      eventId,
      eventKey,
      auditHash,
      cid,
      contractAddress,
      chainId: configuredChainId,
      transactionHash:
        transaction.hash,
      blockNumber:
        receipt.blockNumber,
      gasUsed:
        receipt.gasUsed.toString(),
    }
  }
