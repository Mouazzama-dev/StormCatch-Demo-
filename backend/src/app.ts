import express, { type Express } from 'express'

interface HealthResponse {
  readonly status: 'ok'
  readonly service: 'stormcatch-authorization-api'
  readonly apiVersion: 'v1'
}

export const createApp = (): Express => {
  const app = express()

  app.disable('x-powered-by')

  app.use(
    express.json({
      limit: '1mb',
    }),
  )

  app.get('/health', (_request, response) => {
    const body: HealthResponse = {
      status: 'ok',
      service: 'stormcatch-authorization-api',
      apiVersion: 'v1',
    }

    response.status(200).json(body)
  })

  return app
}
