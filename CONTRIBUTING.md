# Contributing

Blackwall accepts focused contributions to the public policy, protocol, schemas, tests, examples, and documentation.

## Before opening a change

- Read the security boundary and threat model.
- Use a public issue for ordinary bugs and proposals.
- Use the private security process for vulnerabilities.
- Keep commercial product code and credentials outside this repository.

## Development

Requirements: Node.js 20 or newer.

```console
npm run check
```

Changes must include tests for observable behavior and update documentation when the protocol, policy language, or security boundary changes. Security-sensitive architecture changes require an ADR.

## Pull requests

A pull request should explain:

- the concrete problem;
- the resulting behavior;
- any change to the trust boundary;
- tests and validation performed;
- compatibility impact.

Keep commits small and use imperative subjects. Do not add generated user data, binaries, credentials, malware, proprietary threat intelligence, or third-party code without a license review.

## Sign-off

Contributions use the Developer Certificate of Origin. Add a `Signed-off-by` line to each commit with `git commit -s`. The sign-off certifies that you have the right to submit the contribution under this repository's license.
