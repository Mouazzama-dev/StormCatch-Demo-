import type {
  AuthorizationAction,
  AuthorizationResource,
} from './request.js'

export const AUTHORIZATION_POLICY_ID =
  'warehouse-demo-policy-v1' as const

interface AuthorizationPolicyInput {
  readonly resource: AuthorizationResource
  readonly action: AuthorizationAction
}

export interface AuthorizationPolicyEvaluation
  extends AuthorizationPolicyInput {
  readonly policyId: typeof AUTHORIZATION_POLICY_ID
  readonly permitted: boolean
}

type PolicyRules = Readonly<
  Record<
    AuthorizationResource,
    Readonly<Record<AuthorizationAction, boolean>>
  >
>

const policyRules: PolicyRules = Object.freeze({
  'warehouse-zone-a': Object.freeze({
    'scan-inventory': true,
    'move-container': false,
  }),
})

export const evaluateAuthorizationPolicy = ({
  resource,
  action,
}: AuthorizationPolicyInput): AuthorizationPolicyEvaluation => ({
  policyId: AUTHORIZATION_POLICY_ID,
  resource,
  action,
  permitted: policyRules[resource][action],
})
