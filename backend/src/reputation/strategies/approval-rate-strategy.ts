import type {
  ReputationScore,
  ReputationStrategy,
  ReputationStrategyInput,
} from '../types.js'

const STRATEGY_ID = 'approval-rate'
const STRATEGY_VERSION = '1.0.0'

const roundScore = (
  score: number,
): number =>
  Math.round(score * 100) / 100

export const approvalRateStrategy:
  ReputationStrategy = {
    id: STRATEGY_ID,
    version: STRATEGY_VERSION,
    name: 'Approval Rate Strategy',
    description:
      'Calculates reputation from the number of approved and rejected authorization events.',

    calculate(
      input: ReputationStrategyInput,
    ): ReputationScore {
      const robotDid =
        input.robotDid.trim()

      if (robotDid.length === 0) {
        throw new Error(
          'robotDid is required',
        )
      }

      const robotEvents =
        input.events.filter(
          (event) =>
            event.actorDid === robotDid,
        )

      const approvedCount =
        robotEvents.filter(
          (event) =>
            event.decision === 'APPROVE',
        ).length

      const rejectedCount =
        robotEvents.filter(
          (event) =>
            event.decision === 'REJECT',
        ).length

      const totalEventCount =
        approvedCount + rejectedCount

      /*
       * Laplace smoothing:
       *
       * No history        = 50
       * One approval      = 66.67
       * One rejection     = 33.33
       */
      const score = roundScore(
        (
          (approvedCount + 1) /
          (totalEventCount + 2)
        ) * 100,
      )

      return {
        strategyId: STRATEGY_ID,
        strategyVersion:
          STRATEGY_VERSION,
        robotDid,
        score,
        minimumScore: 0,
        maximumScore: 100,
        approvedCount,
        rejectedCount,
        totalEventCount,
        calculatedAt:
          new Date().toISOString(),
      }
    },
  }
