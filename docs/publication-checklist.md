# Publication Checklist

The repository is a local scaffold until every blocking item is complete.

- [ ] Complete a trademark search for the Blackwall name.
- [x] Select the real GitHub owner or organization.
- [x] Replace the `OWNER` placeholder in the private-advisory link.
- [x] Identify the real maintainer account in `MAINTAINERS.md`.
- [x] Add a valid public contact route without exposing private credentials.
- [ ] Review Apache-2.0, NOTICE, trademark, and contribution terms with appropriate counsel.
- [x] Pin GitHub Actions to reviewed full commit SHAs.
- [ ] Enable branch protection, dependency review, CodeQL, secret scanning, and push protection where available.
- [ ] Run `npm run check` from a clean checkout on Windows and Linux.
- [x] Run `npm run publication-check` and resolve every reported item.
- [x] Review the complete Git history for secrets and personal paths.
- [x] Confirm that no binaries, signatures, model weights, private endpoints, user data, or commercial code are present.
- [x] Confirm every README claim against the current security boundary.
- [x] Publish as `v0.1.0-experimental`; do not publish production binaries.
