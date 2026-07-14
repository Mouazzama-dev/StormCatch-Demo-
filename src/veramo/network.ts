import { JsonRpcProvider } from 'ethers'
import { deployments } from 'ethr-did-resolver'

import { environment } from '../config/environment.js'

const deployment = deployments.find(
  ({ name }) => name === environment.network,
)

if (!deployment) {
  throw new Error(
    `No did:ethr registry deployment found for ${environment.network}`,
  )
}

export const ethrNetwork = Object.freeze({
  name: environment.network,
  chainId: deployment.chainId,
  rpcUrl: environment.sepoliaRpcUrl,
  registry: deployment.registry,
})

export const rpcProvider = new JsonRpcProvider(
  environment.sepoliaRpcUrl,
  environment.network,
)
