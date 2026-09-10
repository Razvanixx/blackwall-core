import { once } from 'node:events';
import { BlackwallError, ErrorCode } from '../errors.mjs';

export async function serveLineChannel({
  readable,
  writable,
  submit,
  signal,
  maxFrames = 32,
  maxFrameBytes = 16_384,
  maxResponseBytes = 65_536,
}) {
  if (
    !readable ||
    !writable ||
    typeof submit !== 'function' ||
    !Number.isSafeInteger(maxFrames) ||
    maxFrames < 1 ||
    maxFrames > 1_000 ||
    !Number.isSafeInteger(maxFrameBytes) ||
    maxFrameBytes < 256 ||
    maxFrameBytes > 65_536 ||
    !Number.isSafeInteger(maxResponseBytes) ||
    maxResponseBytes < 256 ||
    maxResponseBytes > 1_500_000
  ) throw new BlackwallError(ErrorCode.CHANNEL_LIMIT, 'Invalid channel configuration.');

  const decoder = new TextDecoder('utf-8', { fatal: true });
  let pending = Buffer.alloc(0);
  let frames = 0;
  let streamFailure;
  const captureFailure = (error) => {
    streamFailure ??= error;
  };
  const cancel = () => {
    readable.destroy(new Error('Channel cancelled.'));
    writable.destroy();
  };

  readable.on('error', captureFailure);
  writable.on('error', captureFailure);
  signal?.addEventListener('abort', cancel, { once: true });

  try {
    if (signal?.aborted) throw new Error('Channel cancelled.');
    for await (const chunk of readable) {
      if (signal?.aborted || streamFailure) throw streamFailure ?? new Error('Channel cancelled.');
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      if (bytes.length > 65_536) {
        throw new BlackwallError(ErrorCode.CHANNEL_LIMIT, 'Channel chunk limit exceeded.');
      }
      pending = Buffer.concat([pending, bytes]);

      let newline;
      while ((newline = pending.indexOf(10)) >= 0) {
        frames += 1;
        if (newline > maxFrameBytes || frames > maxFrames) {
          throw new BlackwallError(ErrorCode.CHANNEL_LIMIT, 'Channel frame limit exceeded.');
        }
        const line = pending.subarray(0, newline);
        pending = pending.subarray(newline + 1);
        const response = await submit(decoder.decode(line));
        if (signal?.aborted || streamFailure) {
          throw streamFailure ?? new Error('Channel cancelled.');
        }
        const output = Buffer.from(`${JSON.stringify(response)}\n`);
        if (output.length > maxResponseBytes) {
          throw new BlackwallError(ErrorCode.CHANNEL_LIMIT, 'Channel response limit exceeded.');
        }
        if (!writable.write(output)) await once(writable, 'drain', { signal });
      }
      if (pending.length > maxFrameBytes) {
        throw new BlackwallError(ErrorCode.CHANNEL_LIMIT, 'Channel frame limit exceeded.');
      }
    }
    if (pending.length) {
      throw new BlackwallError(ErrorCode.PROTOCOL_INVALID, 'Channel ended with a truncated frame.');
    }
    return Object.freeze({ frames });
  } finally {
    signal?.removeEventListener('abort', cancel);
  }
}
