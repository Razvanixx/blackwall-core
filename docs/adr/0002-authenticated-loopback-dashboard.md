# ADR 0002: Authenticated Loopback Dashboard

- Status: accepted
- Date: 2026-09-10

## Context

The experimental core needs a usable owner interface before privileged operating-system enforcement exists. Exposing an unauthenticated management API, binding to non-loopback interfaces, or mixing browser state with an agent capability would expand the attack surface prematurely.

## Decision

The development dashboard:

- binds only to IPv4 loopback on a random port by default;
- generates a high-entropy owner token for each process lifetime;
- places that token in the URL fragment for bootstrap and removes the fragment immediately;
- retains the token only in page memory;
- requires bearer authentication for every owner API route;
- rejects browser API requests with a foreign `Origin`;
- validates the `Host` header against the active listener;
- applies a restrictive Content Security Policy and related browser headers;
- limits JSON request bodies and returns no stack traces;
- performs policy simulation only and reports enforcement level `L0`.

The health endpoint reveals only liveness and enforcement level. Static interface assets are public to the local machine and contain no secret state.

## Consequences

Reloading the page requires reopening the one-time URL printed by the running process. Any local process acting as the same user can attempt to connect, but cannot use owner APIs without the token. This design does not replace authenticated OS IPC or a privileged service and must not be presented as an enforcement boundary.
