import { createApp } from './app.js'
import { database } from '../../src/veramo/database.js'

const DEFAULT_PORT = 3_000
const DEFAULT_HOST = '127.0.0.1'

const parsePort = (
  value: string | undefined,
): number => {
  if (!value) {
    return DEFAULT_PORT
  }

  const port = Number(value)

  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65_535
  ) {
    throw new Error(
      'API_PORT must be an integer between 1 and 65535',
    )
  }

  return port
}

const host =
  process.env.API_HOST?.trim() || DEFAULT_HOST

const port = parsePort(process.env.API_PORT)

const app = createApp()

const server = app.listen(port, host, () => {
  console.log(
    `StormCatch Authorization API running at http://${host}:${port}`,
  )
})

let isShuttingDown = false

const closeDatabase = async (): Promise<void> => {
  const connection = await database.catch(() => undefined)

  if (connection?.isInitialized) {
    await connection.destroy()
  }
}

const shutdown = async (
  signal: NodeJS.Signals,
): Promise<void> => {
  if (isShuttingDown) {
    return
  }

  isShuttingDown = true

  console.log(`\n${signal} received. Shutting down...`)

  server.close(async (serverError) => {
    try {
      await closeDatabase()

      if (serverError) {
        throw serverError
      }

      console.log('Server stopped successfully.')
      process.exit(0)
    } catch (error: unknown) {
      console.error(
        error instanceof Error
          ? error.message
          : 'Unknown shutdown error',
      )

      process.exit(1)
    }
  })
}

server.on('error', async (error) => {
  console.error('API server failed to start:', error.message)

  await closeDatabase()
  process.exitCode = 1
})

process.once('SIGINT', () => {
  void shutdown('SIGINT')
})

process.once('SIGTERM', () => {
  void shutdown('SIGTERM')
})
