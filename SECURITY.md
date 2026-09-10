# Security Policy

## Supported versions

Blackwall Core is experimental. Security fixes are applied to the latest `0.x` release and the default branch. No release currently provides a production sandbox or endpoint-security boundary.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use GitHub's **Report a vulnerability** action on the repository Security tab to create a private security advisory.

Include:

- affected commit or version;
- component and enforcement level;
- reproduction steps using harmless fixtures;
- impact and the boundary crossed;
- suggested mitigation, if available.

Do not include real credentials, personal documents, malware, or exploit payloads. The project will acknowledge a valid private report when maintainer capacity permits. Response-time guarantees will be published only when an operational security team exists.

## Scope

Policy bypass, authentication errors, replay, unintended content disclosure, fail-open behavior, resource exhaustion, and documentation that materially overstates an enforcement boundary are in scope.

The documented absence of OS sandboxing in `0.1` is a known limitation, not a vulnerability in the current claim.
