export const authorizationConfig = Object.freeze({
  domain: 'authorization.demo.local',
  challengeTtlMs: 5 * 60 * 1_000,
  challengeByteLength: 32,
} as const)
