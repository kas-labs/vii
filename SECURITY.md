# Security Policy

Vii is currently experimental and pre-alpha. No stable public runtime or supported release line exists yet.

Security reports are still important during architecture and implementation work.

## Reporting a vulnerability

Do not publish a suspected vulnerability in a public issue, pull request, discussion, social post, or public chat.

Use GitHub private vulnerability reporting when it is enabled for this repository.

If private vulnerability reporting is not available, contact the repository owner through a private channel and include only enough information to establish contact. Do not send secrets, personal data, exploit payloads, or third-party data through a public channel.

## What to include

A useful report contains:

- affected repository, package, branch, commit, or version;
- affected environment and runtime;
- vulnerability class;
- reproduction steps or a minimal private proof of concept;
- expected and observed behavior;
- security impact;
- whether the issue is already being exploited;
- suggested mitigation, when known;
- reporter contact details for private follow-up.

Please redact unrelated secrets, credentials, personal data, and customer information.

## In-scope areas

Examples include:

- template, HTML, JavaScript, URL, CSS, SQL, NoSQL, command, or log injection;
- unsafe SSR serialization or hydration;
- cross-request State or authorization leakage;
- client bundle secret leakage;
- CSRF or SSRF weaknesses;
- path traversal, unsafe archive extraction, or file upload handling;
- CLI project-root escape or hidden command execution;
- registry integrity, dependency confusion, or executable installation behavior;
- plugin permission escalation;
- package publication or supply-chain compromise;
- diagnostics or telemetry data exposure;
- prompt injection leading to unauthorized AI tool actions;
- native desktop or mobile capability escape.

## Out of scope

Vii cannot generally treat these as framework vulnerabilities without evidence of a Vii defect:

- deliberately malicious application code;
- fully compromised developer or server machines;
- vulnerabilities solely in an application's business authorization policy;
- unsupported third-party packages or plugins not distributed by Vii;
- attacks requiring unsafe behavior that Vii explicitly documents as unsupported and blocks by default;
- social engineering without a technical Vii vulnerability.

These reports may still identify documentation or hardening opportunities.

## Handling process

The intended process is:

1. acknowledge the private report;
2. reproduce and classify the issue;
3. identify affected packages and versions;
4. develop and test a fix;
5. prepare release, mitigation, and advisory information;
6. coordinate disclosure with the reporter where practical;
7. revoke affected credentials or artifacts when required;
8. update the Threat Model, tests, and documentation when assumptions change.

Exact response timelines will be published before stable public releases and when maintainer capacity is established.

## Supported versions

There are currently no supported stable versions.

When public releases exist, this file will list maintained release lines and security update expectations.

## Safe research

Please:

- use test data and isolated environments;
- avoid privacy violations and service disruption;
- do not access data that does not belong to you;
- stop after demonstrating the minimum impact required;
- allow time for remediation before public disclosure.

## Security architecture

See:

- `docs/security/SECURITY_ARCHITECTURE.md`;
- `docs/security/THREAT_MODEL.md`;
- `docs/quality/SECURITY_AND_PRIVACY.md`;
- RFC 0020.
