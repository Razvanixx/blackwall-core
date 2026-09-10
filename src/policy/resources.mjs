import path from 'node:path';
import { BlackwallError, ErrorCode } from '../errors.mjs';

export const ACTIONS = Object.freeze([
  'file.read',
  'file.write',
  'process.start',
  'network.connect',
]);

const actionSet = new Set(ACTIONS);
const identifierPattern = /^[A-Za-z0-9_-]{1,80}$/;

export function isIdentifier(value) {
  return typeof value === 'string' && identifierPattern.test(value);
}

export function hasExactKeys(value, allowed, required = allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.every((key) => allowed.includes(key)) && required.every((key) => keys.includes(key));
}

function invalid(message) {
  throw new BlackwallError(ErrorCode.INVALID_POLICY, message);
}

export function normalizeWindowsPath(value) {
  if (
    typeof value !== 'string' ||
    value.length > 1024 ||
    !/^[A-Za-z]:\\/.test(value) ||
    /[\x00-\x1f<>"|?*/]/.test(value) ||
    value.slice(2).includes(':')
  ) invalid('Resource path must be an absolute local Windows path.');

  const parts = value.slice(3).split('\\');
  if (
    parts.some(
      (part) =>
        !part ||
        part === '.' ||
        part === '..' ||
        /[. ]$/.test(part) ||
        /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part),
    )
  ) invalid('Resource path is ambiguous or contains a reserved component.');

  return path.win32.normalize(value).toLowerCase();
}

export function normalizeHostname(value) {
  if (
    typeof value !== 'string' ||
    value.length > 253 ||
    value !== value.toLowerCase() ||
    !value.includes('.') ||
    !value
      .split('.')
      .every((part) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(part))
  ) invalid('Network host must be an exact lowercase DNS hostname.');
  return value;
}

export function normalizeResource(action, resource) {
  if (!actionSet.has(action)) invalid('Unsupported policy action.');

  if (action === 'file.read' || action === 'file.write') {
    if (!hasExactKeys(resource, ['path'])) invalid('Invalid file resource.');
    return Object.freeze({ path: normalizeWindowsPath(resource.path) });
  }

  if (action === 'network.connect') {
    if (
      !hasExactKeys(resource, ['host', 'port', 'protocol']) ||
      resource.protocol !== 'tcp' ||
      !Number.isInteger(resource.port) ||
      resource.port < 1 ||
      resource.port > 65535
    ) invalid('Invalid network resource.');
    return Object.freeze({
      host: normalizeHostname(resource.host),
      port: resource.port,
      protocol: resource.protocol,
    });
  }

  if (
    !hasExactKeys(resource, ['path', 'sha256', 'args']) ||
    !/^[a-f0-9]{64}$/.test(resource.sha256) ||
    !Array.isArray(resource.args) ||
    resource.args.length > 32 ||
    resource.args.some(
      (argument) =>
        typeof argument !== 'string' || argument.length > 2048 || /[\x00-\x1f]/.test(argument),
    )
  ) invalid('Invalid process resource.');

  return Object.freeze({
    path: normalizeWindowsPath(resource.path),
    sha256: resource.sha256,
    args: Object.freeze([...resource.args]),
  });
}

export function isSupportedAction(value) {
  return actionSet.has(value);
}
