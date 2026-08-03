# Security

## Reporting a vulnerability

Report privately, not as a public issue. Use GitHub's
[private vulnerability reporting](https://github.com/chase-mew/hyper-identicons/security/advisories/new),
or email chase@manning.dev. You should get an acknowledgement within a few days.

## What counts

This is a rendering library with no network access, no storage and no credentials, so
the interesting surface is narrower than it looks. Things worth reporting:

- Output that escapes its container — an SVG string or `data:` URI that can inject
  script or markup into a page that embeds it, for any input.
- A crash, hang or unbounded allocation reachable from an attacker-supplied address.
- Two conforming implementations disagreeing, or the same address rendering
  differently across releases once `spec/v1.md` is marked Frozen. Until then output is
  explicitly allowed to change and a difference is not a vulnerability.

Not vulnerabilities: an address that renders an ugly cat, and two addresses that
render similar-looking cats. The space is large, but collisions in perception are
inherent to identicons — never use one as the sole means of identifying an address.
