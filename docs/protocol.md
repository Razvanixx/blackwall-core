# Protocol v1

The reference channel uses one UTF-8 JSON frame per line:

```json
{
  "version": 1,
  "sequence": 1,
  "request": {
    "action": "file.read",
    "resource": { "path": "C:\\AgentWork\\input.txt" }
  }
}
```

The trusted owner binds a private channel to a session capability. The agent does not submit its own principal, session, clock, revocations, or policy. Valid in-order requests consume their sequence even when policy denies the action. Malformed and out-of-order frames do not advance the expected sequence.

Default limits are 32 active sessions, 1,000 submissions per session, 16 KiB per request frame, and 32 frames per channel. Deployments may select stricter bounded values.

This wire shape is experimental. Compatibility is guaranteed only within the same `0.x` minor release until the conformance suite and canonical encoding are complete.
