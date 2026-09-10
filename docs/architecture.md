# Architecture

## Design rules

1. The agent is untrusted.
2. Natural language is data, never policy.
3. Policy decisions are deterministic.
4. Identity and time come from a trusted owner.
5. Unknown input fails closed.
6. Every decision identifies its enforcement level.
7. AI analysis cannot grant permissions or invoke privileged operations.

## Current components

`compilePolicy` validates a policy and creates an immutable evaluator. It matches the authenticated principal, session, action, normalized resource, expiration, and revocation state.

`createDecisionBroker` creates bounded sessions. It retains only a SHA-256 digest of each bearer capability, supplies trusted identity and time, consumes ordered sequence numbers, and rejects replayed frames.

`serveLineChannel` is a bounded newline-delimited JSON transport adapter. It does not authenticate an OS peer. A trusted host must bind the channel to one broker session without giving owner functions to the agent.

`createAuditJournal` stores a bounded in-memory record of decision metadata. It intentionally accepts no document content, filenames, prompts, or capabilities.

`createBlackwallApplication` coordinates sessions, decisions, revocation, and the audit journal without executing requested resources.

`createDashboardServer` exposes the owner-facing development interface on an authenticated loopback endpoint. It is a local control-plane prototype, not a privileged enforcement service. See [ADR 0002](adr/0002-authenticated-loopback-dashboard.md).

## Future enforcement architecture

The commercial Windows architecture is expected to separate:

- an unprivileged administration interface;
- a narrowly privileged trusted service;
- an AppContainer or restricted-token workload launcher;
- Job Object resource controls;
- file, process, secret, and network brokers;
- Windows Filtering Platform policy;
- signed policy, update, and audit storage;
- advisory risk analysis with no direct enforcement authority.

Architecture decisions that affect the trust boundary require an ADR in `docs/adr/`.
