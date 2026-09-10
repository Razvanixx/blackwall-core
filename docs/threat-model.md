# Threat Model

## Assets

- user documents and credentials;
- policy and revocation state;
- session capabilities;
- audit integrity;
- endpoint availability;
- trusted service and update identity.

## Adversaries

- an agent manipulated by prompt injection;
- a compromised model runtime, tool, plugin, or integration;
- a malicious protocol client;
- code launched by an agent;
- a network peer attempting exfiltration or command and control;
- compromised update infrastructure.

## Abuse cases

- request a different file after approval;
- exploit path traversal, links, alternate streams, device paths, or ambiguous names;
- forge identity or policy context;
- replay or reorder a request;
- steal a bearer capability;
- exhaust sessions, frames, memory, CPU, processes, or network capacity;
- spawn interpreters or unrestricted children;
- bypass hostname rules through DNS changes, raw addresses, proxies, loopback, or IPv6;
- turn parser, broker, or service failure into an allow decision;
- inject policy instructions through prompts, files, logs, or tool output;
- disable, replace, downgrade, or impersonate Blackwall components.

## Initial exclusions

The experimental core does not defend against kernel, firmware, hypervisor, local-administrator, hardware, or side-channel compromise. It does not contain arbitrary software running under the user's normal account.

## Required validation

OS-enforcement work must be tested in disposable Windows virtual machines without personal data or production credentials. Tests must cover hostile clients, path races, process trees, network bypass, resource exhaustion, broker termination, reboot, upgrade, rollback, and clean uninstall.
