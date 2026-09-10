# Open-core Boundary

Blackwall Core is the public, reviewable foundation of the project. Its purpose is to make the policy model, protocol, schemas, security assumptions, and conformance behavior available for inspection and integration.

## Public core

The public repository is expected to contain:

- the deterministic policy compiler and evaluator;
- protocol types, schemas, and versioning rules;
- bounded framing and session semantics;
- stable public error codes;
- content-free audit event formats;
- conformance tests, harmless examples, and reference documentation;
- research harnesses that do not expose protected product controls.

Public interfaces must remain useful without a commercial subscription. Security claims for this repository are limited to behavior that can be reproduced from its source and tests.

## Product layer

The separate product may contain:

- privileged endpoint services and operating-system enforcement;
- signed policy distribution and update infrastructure;
- commercial threat intelligence and detection content;
- fleet administration, telemetry operations, and incident workflows;
- licensing, billing, support, and managed-service integrations;
- hardening details whose disclosure would materially weaken deployed controls.

The product may use Blackwall Core, but product features are not implied by the presence of a public API or roadmap item.

## Compatibility and naming

Third parties may implement the published protocol under the repository license. Compatibility claims should identify the protocol version and conformance suite used. The Apache License does not grant permission to present a modified product as an official Blackwall release; see [TRADEMARKS.md](../TRADEMARKS.md).

This boundary can change through a documented governance decision. Removing an already-published interface requires the normal compatibility and deprecation process.
