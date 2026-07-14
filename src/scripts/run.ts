import { database } from '../veramo/database.js'

type Script = () => Promise<void>

export const run = async (script: Script): Promise<void> => {
  try {
    await script()
  } catch (error: unknown) {
    console.error(
      error instanceof Error
        ? error.stack ?? error.message
        : String(error),
    )

    process.exitCode = 1
  } finally {
    const connection = await database.catch(() => undefined)

    if (connection?.isInitialized) {
      await connection.destroy()
    }
  }
}
