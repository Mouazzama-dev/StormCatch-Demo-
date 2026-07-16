import type {
  StoredAuthorizationResult,
} from '../services/authorization-result-store.js'

export interface ReputationStrategyInput {
  readonly robotDid: string
  readonly events:
    readonly StoredAuthorizationResult[]
}

export interface ReputationScore {
  readonly strategyId: string
  readonly strategyVersion: string
  readonly robotDid: string
  readonly score: number
  readonly minimumScore: 0
  readonly maximumScore: 100
  readonly approvedCount: number
  readonly rejectedCount: number
  readonly totalEventCount: number
  readonly calculatedAt: string
}

export interface ReputationStrategy {
  readonly id: string
  readonly version: string
  readonly name: string
  readonly description: string

  calculate(
    input: ReputationStrategyInput,
  ): ReputationScore
}