# Changelog

## Unreleased

- Added an authenticated loopback dashboard with overview, policy lab, and audit views.
- Added an application controller that coordinates policy sessions and content-free audit events.
- Added integration coverage for host, origin, owner-token, and security-header controls.

All notable changes to the public project will be documented here. The project uses semantic versioning during the experimental `0.x` series; protocol compatibility may change between minor versions.

## 0.1.0 — Unreleased

- Added deterministic default-deny policy evaluation.
- Added principal- and session-bound expiring grants and revocation.
- Added bounded session protocol with capability hashing and replay refusal.
- Added bounded line-channel adapter and content-free in-memory audit journal.
- Added stable error codes and explicit `L0` enforcement-level reporting.
- Added JSON schemas, harmless examples, CLI, tests, threat model, and security boundary.
