# Open Source Packaging Notes

## License

Apache 2.0 is proposed.

Rationale:

- Cloudflare Agentic Inbox is Apache 2.0.
- Apache 2.0 gives a patent grant.
- Hermes Agent is MIT, and MIT is compatible with Apache 2.0.

## Public repo target

```text
github.com/elijahmuraoka/hermes-dm-inbox
```

The repo is already public. That changes the default bar:

- no private paths in README examples except local development notes
- no references to personal-only credentials, private agent names, or client data
- no real message fixtures
- no screenshots containing real DMs
- public docs/specs can land first; implementation can follow after review

## User prerequisites

Required:

- Hermes Agent installed locally
- macOS for first-class connector support
- Bun >= 1.3
- Python >= 3.11
- uv

Optional connectors:

- `imsg`
- `linkedin-os`
- `xurl`
- `gog`

## README promise

Eventually:

```bash
git clone https://github.com/elijahmuraoka/hermes-dm-inbox.git
cd hermes-dm-inbox
bun install
bun run dev
```

Open `http://127.0.0.1:5175` and see a mock inbox with no credentials configured.