import { identityAliases } from '../config/identities.js'
import { environment } from '../config/environment.js'
import { agent } from '../veramo/agent.js'
import { run } from './run.js'

await run(async () => {
  const identities = []

  for (const [role, alias] of Object.entries(identityAliases)) {
    const identifier = await agent.didManagerGetOrCreate({
      alias,
      provider: environment.didProvider,
    })

    identities.push({
      role,
      alias,
      did: identifier.did,
    })
  }

  console.table(identities)
})
