import { agent } from '../veramo/agent.js'
import { database } from '../veramo/database.js'
import { run } from './run.js'

await run(async () => {
  const connection = await database
  const identifiers = await agent.didManagerFind()

  console.log({
    databaseInitialized: connection.isInitialized,
    managedDidCount: identifiers.length,
  })
})
