import { Entities, migrations } from '@veramo/data-store'
import { DataSource } from 'typeorm'

import { environment } from '../config/environment.js'

export const database = new DataSource({
  type: 'sqlite',
  database: environment.databaseFile,
  entities: Entities,
  migrations,
  migrationsRun: true,
  synchronize: false,
  logging: ['error', 'warn'],
}).initialize()
