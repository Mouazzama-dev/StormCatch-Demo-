import { approvalRateStrategy } from './strategies/approval-rate-strategy.js'

import type {
  ReputationScore,
  ReputationStrategy,
  ReputationStrategyInput,
} from './types.js'

const createStrategyKey = (
  strategyId: string,
  strategyVersion: string,
): string =>
  `${strategyId}@${strategyVersion}`

export class ReputationEngine {
  private readonly strategies =
    new Map<string, ReputationStrategy>()

  constructor(
    strategies:
      readonly ReputationStrategy[] = [],
  ) {
    for (const strategy of strategies) {
      this.register(strategy)
    }
  }

  register(
    strategy: ReputationStrategy,
  ): void {
    const strategyKey =
      createStrategyKey(
        strategy.id,
        strategy.version,
      )

    if (
      this.strategies.has(strategyKey)
    ) {
      throw new Error(
        `Reputation strategy already registered: ${strategyKey}`,
      )
    }

    this.strategies.set(
      strategyKey,
      strategy,
    )
  }

  listStrategies():
    readonly ReputationStrategy[] {
    return Array.from(
      this.strategies.values(),
    )
  }

  calculate(
    strategyId: string,
    strategyVersion: string,
    input: ReputationStrategyInput,
  ): ReputationScore {
    const strategyKey =
      createStrategyKey(
        strategyId,
        strategyVersion,
      )

    const strategy =
      this.strategies.get(strategyKey)

    if (!strategy) {
      throw new Error(
        `Unknown reputation strategy: ${strategyKey}`,
      )
    }

    return strategy.calculate(input)
  }

  calculateAll(
    input: ReputationStrategyInput,
  ): readonly ReputationScore[] {
    return this.listStrategies().map(
      (strategy) =>
        strategy.calculate(input),
    )
  }
}

export const reputationEngine =
  new ReputationEngine([
    approvalRateStrategy,
  ])
