# Engineering Practices

## Worktree policy

- `<repo-root>` is the canonical main checkout.
- Main stays on `main`.
- All spec, code, and review work happens in `wt` worktrees.
- Use `wt new`, `wt list`, `wt remove`, `wt cleanup`; never raw `git worktree add/remove`.

Current spec worktree:

```text
<worktree-root>
```

## Package policy

- JS package manager/runtime: Bun
- Do not introduce pnpm/yarn/npm lockfiles.
- Use `bun install`, `bun run <script>`, `bun test`.
- Backend dependencies use `uv`.

## Quality gates

Before any implementation branch is reviewable:

- `bun test` passes for web/workspace tests
- `bun run build` passes for web build
- `cd apps/server && uv run --extra dev pytest` passes for server
- Browser visual QA is captured for UI changes
- `tomoji docs audit` passes with no new critical issues
- `tomoji docs index --verify` passes

## Security invariants

- Phase 0/1 connectors are read-only.
- No raw message bodies in list endpoints, logs, or audit payloads.
- Full-body reveal is explicit and traceable.
- Local Hermes adapter is opt-in, not default.
- No outbound sends until Phase 4.