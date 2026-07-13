# Security Policy

## Reporting a vulnerability

Please report vulnerabilities privately. **Do not open a public issue for a security problem.**

Preferred channel: [GitHub Security Advisories for this repository](https://github.com/elijahmuraoka/hermes-dm-inbox/security/advisories/new) ("Report a vulnerability").

If you cannot use GitHub Security Advisories, email [elijah@soshi.io](mailto:elijah@soshi.io) with a description of the issue, steps to reproduce, and the impact you believe it has.

You should receive an acknowledgment within a few days. Please give us a reasonable window to investigate and fix the issue before any public disclosure.

## Supported versions

Only the `main` branch is supported. There are no release lines yet; fixes land on `main`.

## Scope notes

The current codebase (Phase 0) is a frontend-only web slice running against fictional fixture data, with no backend, no real accounts, and no real platform integrations. Reports about the UI slice are still welcome (for example XSS-class issues in rendering), and the scope will grow as real integrations land.
