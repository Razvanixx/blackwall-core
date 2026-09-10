# Roadmap

## 0.1 — Experimental core

- deterministic default-deny policy;
- bounded session broker and replay refusal;
- bounded stream adapter and audit journal;
- schemas, CLI, examples, tests, and security documentation.

## 0.2 — Protocol hardening

- authenticated loopback dashboard and policy lab;
- canonical encoding;
- structured conformance vectors;
- property tests and fuzz harnesses;
- monotonic deadline abstraction;
- per-session scheduling and quotas;
- JavaScript SDK.

## 0.3 — Windows isolation research

- AppContainer/LPAC launcher prototype;
- restricted-token compatibility fallback;
- Job Object limits and child-process controls;
- inherited-handle allowlist;
- disposable-VM escape tests.

## 0.4 — Trusted broker research

- authenticated local IPC;
- owner and agent API separation;
- protected policy storage;
- service crash/restart semantics;
- handle-based resource authorization.

## Later product work

- network enforcement through Windows Filtering Platform;
- process and filesystem enforcement;
- signed updates and rollback protection;
- AI-assisted incident triage;
- installer, privacy controls, external assessment, and commercial editions.

No roadmap item is a release promise. Security claims follow demonstrated exit criteria.
