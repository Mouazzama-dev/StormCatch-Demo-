export const identityAliases = Object.freeze({
  regulator: 'regulator',
  integrator: 'integrator',
  deployer: 'deployer',
  operator: 'operator',
  robot: 'robot-001',
  authorizationGateway: 'authorization-gateway',
} as const)

export type IdentityRole = keyof typeof identityAliases
export type IdentityAlias = (typeof identityAliases)[IdentityRole]
