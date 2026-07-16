import express, { type Express } from 'express'

import { createAuthRouter } from './routes/auth.js'
import {
  createAuthorizationRouter,
} from './routes/authorization.js'
import { createDemoRouter } from './routes/demo.js'

import { createAuditRouter } from './routes/audits.js'

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

  app.use('/api/v1/auth', createAuthRouter())
  app.use('/api/v1/demo', createDemoRouter())

  app.use(
    '/api/v1/authorization',
    createAuthorizationRouter(),
  )

  app.use('/api/v1/audits', createAuditRouter())

  return app
}
