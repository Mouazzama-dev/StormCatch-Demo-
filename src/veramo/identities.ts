import type { IIdentifier } from '@veramo/core'

import {
  identityAliases,
  type IdentityRole,
} from '../config/identities.js'
import { environment } from '../config/environment.js'
import { agent } from './agent.js'

export const getIdentity = (
  role: IdentityRole,
): Promise<IIdentifier> =>
  agent.didManagerGetByAlias({
    alias: identityAliases[role],
    provider: environment.didProvider,
  })
