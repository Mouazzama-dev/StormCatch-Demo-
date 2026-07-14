import { createAgent } from '@veramo/core'
import type {
  ICredentialPlugin,
  IDataStore,
  IDataStoreORM,
  IDIDManager,
  IKeyManager,
  IResolver,
} from '@veramo/core'
import { CredentialProviderJWT } from '@veramo/credential-jwt'
import { CredentialPlugin } from '@veramo/credential-w3c'
import {
  DataStore,
  DataStoreORM,
  DIDStore,
  KeyStore,
  PrivateKeyStore,
} from '@veramo/data-store'
import { DIDManager } from '@veramo/did-manager'
import { EthrDIDProvider } from '@veramo/did-provider-ethr'
import { DIDResolverPlugin } from '@veramo/did-resolver'
import { KeyManager } from '@veramo/key-manager'
import { KeyManagementSystem, SecretBox } from '@veramo/kms-local'
import { Resolver } from 'did-resolver'
import { getResolver as getEthrResolver } from 'ethr-did-resolver'

import { environment } from '../config/environment.js'
import { database } from './database.js'
import { ethrNetwork, rpcProvider } from './network.js'

const localKms = 'local'

export type VeramoAgent = IDIDManager &
  IKeyManager &
  IResolver &
  ICredentialPlugin &
  IDataStore &
  IDataStoreORM

const didResolver = new Resolver(
  getEthrResolver({
    networks: [ethrNetwork],
  }),
)

export const agent = createAgent<VeramoAgent>({
  plugins: [
    new KeyManager({
      store: new KeyStore(database),
      kms: {
        [localKms]: new KeyManagementSystem(
          new PrivateKeyStore(
            database,
            new SecretBox(environment.kmsSecretKey),
          ),
        ),
      },
    }),

    new DIDManager({
      store: new DIDStore(database),
      defaultProvider: environment.didProvider,
      providers: {
        [environment.didProvider]: new EthrDIDProvider({
          defaultKms: localKms,
          networks: [
            {
              ...ethrNetwork,
              provider: rpcProvider,
            },
          ],
        }),
      },
    }),

    new DIDResolverPlugin({
      resolver: didResolver,
    }),

    new CredentialPlugin([
      new CredentialProviderJWT(),
    ]),

    new DataStore(database),
    new DataStoreORM(database),
  ],
})
