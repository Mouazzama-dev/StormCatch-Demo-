import type {
  AuthorizationDecision,
} from '../authorization/decision.js'

const bannerLine = '═'.repeat(68)
const sectionLine = '─'.repeat(68)

const printValue = (
  label: string,
  value?: string | number | boolean,
): void => {
  console.log(
    value === undefined
      ? `  ${label}`
      : `  ${label}: ${String(value)}`,
  )
}

export const printBanner = (
  title: string,
  subtitle?: string,
): void => {
  console.log()
  console.log(bannerLine)
  console.log(` ${title}`)

  if (subtitle) {
    console.log(` ${subtitle}`)
  }

  console.log(bannerLine)
}

export const printSection = (
  step: number,
  totalSteps: number,
  title: string,
): void => {
  console.log()
  console.log(sectionLine)
  console.log(` [${step}/${totalSteps}] ${title}`)
  console.log(sectionLine)
}

export const printSuccess = (
  label: string,
  value?: string | number | boolean,
): void => {
  printValue(`✓ ${label}`, value)
}

export const printFailure = (
  label: string,
  value?: string | number | boolean,
): void => {
  printValue(`✗ ${label}`, value)
}

export const printInfo = (
  label: string,
  value?: string | number | boolean,
): void => {
  printValue(label, value)
}

export const printList = (
  label: string,
  values: readonly string[],
): void => {
  printValue(label)

  for (const value of values) {
    console.log(`    - ${value}`)
  }
}

export const printDecision = (
  decision: AuthorizationDecision,
): void => {
  console.log()
  console.log(bannerLine)
  console.log(` DECISION: ${decision.decision}`)
  console.log(` Reason: ${decision.reason}`)

  if (
    decision.decision === 'REJECT' &&
    decision.details
  ) {
    console.log(` Details: ${decision.details}`)
  }

  console.log(bannerLine)
}
