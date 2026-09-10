export const ErrorCode = Object.freeze({
  INVALID_POLICY: 'BW_POLICY_INVALID',
  INVALID_CONTEXT: 'BW_CONTEXT_INVALID',
  INVALID_REQUEST: 'BW_REQUEST_INVALID',
  NO_GRANT: 'BW_GRANT_NOT_FOUND',
  SESSION_INVALID: 'BW_SESSION_INVALID',
  SESSION_EXPIRED: 'BW_SESSION_EXPIRED',
  SESSION_CAPACITY: 'BW_SESSION_CAPACITY',
  REQUEST_BUDGET: 'BW_REQUEST_BUDGET',
  PROTOCOL_INVALID: 'BW_PROTOCOL_INVALID',
  REPLAY: 'BW_PROTOCOL_REPLAY',
  CLOCK_INVALID: 'BW_CLOCK_INVALID',
  CHANNEL_LIMIT: 'BW_CHANNEL_LIMIT',
});

export class BlackwallError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BlackwallError';
    this.code = code;
  }
}

export function deny(code, reason, details = {}) {
  return Object.freeze({
    decision: 'deny',
    code,
    reason,
    enforcementLevel: 'L0',
    ...details,
  });
}
