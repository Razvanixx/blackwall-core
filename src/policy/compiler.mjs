import { BlackwallError, ErrorCode, deny } from '../errors.mjs';
import {
  hasExactKeys,
  isIdentifier,
  isSupportedAction,
  normalizeResource,
} from './resources.mjs';

const grantKeys = ['id', 'principal', 'session', 'action', 'resource', 'expiresAt'];

function parseExpiration(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) throw new BlackwallError(ErrorCode.INVALID_POLICY, 'Grant expiration must be canonical UTC.');
  return Date.parse(value);
}

function equalResource(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function compilePolicy(policy) {
  if (
    !hasExactKeys(policy, ['version', 'policyId', 'grants']) ||
    policy.version !== 1 ||
    !isIdentifier(policy.policyId) ||
    !Array.isArray(policy.grants) ||
    policy.grants.length > 256
  ) throw new BlackwallError(ErrorCode.INVALID_POLICY, 'Invalid policy envelope.');

  const policyId = policy.policyId;
  const identifiers = new Set();
  const grants = policy.grants.map((grant) => {
    if (
      !hasExactKeys(grant, grantKeys) ||
      !isIdentifier(grant.id) ||
      !isIdentifier(grant.principal) ||
      !isIdentifier(grant.session) ||
      !isSupportedAction(grant.action) ||
      identifiers.has(grant.id)
    ) throw new BlackwallError(ErrorCode.INVALID_POLICY, 'Invalid or duplicate grant.');

    identifiers.add(grant.id);
    return Object.freeze({
      id: grant.id,
      principal: grant.principal,
      session: grant.session,
      action: grant.action,
      resource: normalizeResource(grant.action, grant.resource),
      expiresAt: grant.expiresAt,
      expiresAtMs: parseExpiration(grant.expiresAt),
    });
  });

  const snapshot = Object.freeze([...grants]);
  return Object.freeze({
    version: 1,
    policyId,
    grants: snapshot,
    evaluate(request, context) {
      if (
        !hasExactKeys(context, ['principal', 'session', 'now', 'revokedGrantIds']) ||
        !isIdentifier(context.principal) ||
        !isIdentifier(context.session) ||
        !Number.isSafeInteger(context.now) ||
        context.now < 0 ||
        !Array.isArray(context.revokedGrantIds) ||
        context.revokedGrantIds.some((identifier) => !isIdentifier(identifier))
      ) return deny(ErrorCode.INVALID_CONTEXT, 'Trusted evaluation context is invalid.');

      if (
        !hasExactKeys(request, ['action', 'resource']) ||
        !isSupportedAction(request.action)
      ) return deny(ErrorCode.INVALID_REQUEST, 'Request is malformed or uses an unsupported action.');

      let requestedResource;
      try {
        requestedResource = normalizeResource(request.action, request.resource);
      } catch {
        return deny(ErrorCode.INVALID_REQUEST, 'Request resource is malformed.');
      }

      const grant = snapshot.find(
        (candidate) =>
          candidate.principal === context.principal &&
          candidate.session === context.session &&
          candidate.action === request.action &&
          candidate.expiresAtMs > context.now &&
          !context.revokedGrantIds.includes(candidate.id) &&
          equalResource(candidate.resource, requestedResource),
      );

      if (!grant) return deny(ErrorCode.NO_GRANT, 'No matching active grant.');
      return Object.freeze({
        decision: 'allow',
        code: 'BW_GRANT_MATCHED',
        reason: 'An exact unexpired grant matched the request.',
        policyId,
        grantId: grant.id,
        enforcementLevel: 'L0',
      });
    },
  });
}
