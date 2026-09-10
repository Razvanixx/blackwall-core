# ADR 0001: Deterministic Policy Controls Enforcement

Status: accepted

## Context

Model output is probabilistic and may be influenced by untrusted content. A security boundary cannot depend on a model deciding whether its own action is permitted.

## Decision

Blackwall uses deterministic policy for authorization. AI analysis may produce advisory risk signals and explanations, but it cannot create grants, edit policy, suppress audit events, or invoke privileged operations directly.

## Consequences

Integrations must express permissions as structured resources and actions. Natural-language requests require translation and owner approval before they become policy. Model failure cannot relax deterministic restrictions.
