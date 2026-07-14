import type { AuthorizationAction } from '../authorization/request.js'
import {
  AuthorizationChallengeStore,
} from '../authorization/challenge-store.js'
import { authorizeRequest } from '../authorization/authorize-request.js'
import { createAuthorizationRequest } from '../authorization/create-request.js'
import { issueAuthorizationChallenge } from '../authorization/issue-challenge.js'
import { identityAliases, type IdentityRole } from '../config/identities.js'
import { getLatestAIIdentityCredential } from '../credentials/get-ai-identity.js'
import {
  printBanner,
  printDecision,
  printFailure,
  printInfo,
  printList,
  printSection,
  printSuccess,
} from '../demo/output.js'
import { getIdentity } from '../veramo/identities.js'
import { run } from './run.js'

const resource = 'warehouse-zone-a' as const
const totalSteps = 6

const getCredentialIssuerDid = (
  issuer: { id: string } | string,
): string =>
  typeof issuer === 'string'
    ? issuer
    : issuer.id

const getCredentialCapabilities = (
  credentialSubject: Record<string, unknown> | Record<string, unknown>[],
): string[] => {
  const subject = Array.isArray(credentialSubject)
    ? credentialSubject[0]
    : credentialSubject

  if (!subject) {
    return []
  }

  const capabilities = subject.capabilities

  return Array.isArray(capabilities)
    ? capabilities.filter(
        (capability): capability is string =>
          typeof capability === 'string',
      )
    : []
}

const runAuthorizationScenario = async (
  store: AuthorizationChallengeStore,
  action: AuthorizationAction,
) => {
  const challenge = issueAuthorizationChallenge({
    store,
  })

  const createdRequest = await createAuthorizationRequest({
    challenge,
    resource,
    action,
  })

  const result = await authorizeRequest({
    request: createdRequest.request,
    store,
  })

  return {
    challenge,
    credentialHash: createdRequest.credentialHash,
    request: createdRequest.request,
    result,
  }
}

await run(async () => {
  printBanner(
    'StormCatch AI Authorization Demo',
    'Milestone 2 — Challenge, Presentation and Policy Gating',
  )

  printSection(1, totalSteps, 'Loading decentralized identities')

  const roles = Object.keys(identityAliases) as IdentityRole[]

  const identities = await Promise.all(
    roles.map(async (role) => ({
      role,
      identifier: await getIdentity(role),
    })),
  )

  for (const { role, identifier } of identities) {
    printSuccess(role, identifier.did)
  }

  const robot = identities.find(
    ({ role }) => role === 'robot',
  )?.identifier

  if (!robot) {
    throw new Error('Robot identity was not found')
  }

  printSection(2, totalSteps, 'Loading AI Identity Credential')

  const storedCredential =
    await getLatestAIIdentityCredential(robot.did)

  const credential = storedCredential.verifiableCredential
  const issuerDid = getCredentialIssuerDid(credential.issuer)
  const capabilities = getCredentialCapabilities(
    credential.credentialSubject,
  )

  printSuccess('Credential found')
  printInfo('Type', 'AIIdentityCredential')
  printInfo('Credential hash', storedCredential.hash)
  printInfo('Issuer', issuerDid)
  printInfo('Subject', robot.did)
  printList('Capabilities', capabilities)

  const store = new AuthorizationChallengeStore()

  printBanner(
    'Scenario 1',
    'Robot requests an allowed operation',
  )

  const approvedScenario = await runAuthorizationScenario(
    store,
    'scan-inventory',
  )

  printSection(3, totalSteps, 'Gateway issued one-time challenge')

  printSuccess(
    'Request ID',
    approvedScenario.challenge.requestId,
  )
  printInfo(
    'Challenge',
    approvedScenario.challenge.challenge,
  )
  printInfo('Domain', approvedScenario.challenge.domain)
  printInfo(
    'Expires in milliseconds',
    approvedScenario.challenge.expiresAt -
      approvedScenario.challenge.issuedAt,
  )

  printSection(4, totalSteps, 'Robot created Verifiable Presentation')

  printSuccess(
    'Holder',
    approvedScenario.request.actorDid,
  )
  printInfo(
    'Credential hash',
    approvedScenario.credentialHash,
  )
  printInfo(
    'Credentials included',
    approvedScenario.request.presentation
      .verifiableCredential?.length ?? 0,
  )
  printSuccess('Presentation signed by Robot')

  printSection(5, totalSteps, 'Gateway verified identity evidence')

  if (
    approvedScenario.result.verification
      .presentationVerified
  ) {
    printSuccess('Presentation signature verified')
    printSuccess('Challenge and domain verified')
    printSuccess('Actor DID matches presentation holder')
  } else {
    printFailure('Presentation verification failed')
  }

  if (
    approvedScenario.result.verification
      .credentialVerified
  ) {
    printSuccess('AI Identity Credential verified')
    printSuccess('Credential subject matches Robot')
  } else {
    printFailure('Credential verification failed')
  }

  printSection(6, totalSteps, 'Policy evaluation')

  printInfo('Resource', resource)
  printInfo('Action', 'scan-inventory')
  printInfo(
    'Policy',
    approvedScenario.result.policy?.policyId,
  )

  if (approvedScenario.result.policy?.permitted) {
    printSuccess('Action permitted by policy')
  } else {
    printFailure('Action denied by policy')
  }

  printDecision(approvedScenario.result.decision)

  printBanner(
    'Replay Protection Test',
    'Submitting the same signed presentation again',
  )

  const replayResult = await authorizeRequest({
    request: approvedScenario.request,
    store,
  })

  if (
    replayResult.decision.decision === 'REJECT' &&
    replayResult.decision.reason ===
      'CHALLENGE_ALREADY_CONSUMED'
  ) {
    printSuccess(
      'Replay blocked',
      replayResult.decision.reason,
    )
  } else {
    printFailure(
      'Replay protection produced an unexpected result',
      replayResult.decision.reason,
    )
  }

  printBanner(
    'Scenario 2',
    'Robot requests a restricted operation',
  )

  const rejectedScenario = await runAuthorizationScenario(
    store,
    'move-container',
  )

  printSuccess(
    'Request ID',
    rejectedScenario.challenge.requestId,
  )
  printInfo('Resource', resource)
  printInfo('Action', 'move-container')

  if (
    rejectedScenario.result.verification
      .presentationVerified
  ) {
    printSuccess('Presentation verified')
  } else {
    printFailure('Presentation verification failed')
  }

  if (
    rejectedScenario.result.verification
      .credentialVerified
  ) {
    printSuccess('AI Identity Credential verified')
  } else {
    printFailure('Credential verification failed')
  }

  if (rejectedScenario.result.policy?.permitted) {
    printSuccess('Action permitted by policy')
  } else {
    printFailure(
      'Action denied by policy',
      'ACTION_NOT_PERMITTED',
    )
  }

  printDecision(rejectedScenario.result.decision)

  printBanner(
    'Milestone 2 Complete',
    'DID → VC → Challenge → VP → Verification → Policy Decision',
  )
})
