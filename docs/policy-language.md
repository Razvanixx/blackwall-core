# Policy Language v1

A policy contains a version, policy identifier, and at most 256 exact grants. A grant binds one principal and session to one action, resource, and canonical UTC expiration.

Supported actions:

- `file.read` and `file.write`: exact absolute local Windows path;
- `process.start`: exact path, lowercase SHA-256, and ordered argument list;
- `network.connect`: exact lowercase DNS hostname, TCP port, and protocol.

The initial profile deliberately rejects relative, UNC, device, traversal, alternate-stream, reserved-component, and mixed-separator paths. Network wildcards and raw IP addresses are not supported. These constraints reduce ambiguity; they do not prove the identity of an operating-system object.

Unknown versions, actions, fields, and malformed resources deny access. Expiration is exclusive: a grant is inactive when `now >= expiresAt`.

See `schemas/policy-v1.schema.json`. Runtime validation remains authoritative because JSON Schema cannot express every Windows normalization rule.
