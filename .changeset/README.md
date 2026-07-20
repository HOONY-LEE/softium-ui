# Changesets

This folder is managed by [changesets](https://github.com/changesets/changesets).
To record a change for the next release, run:

```bash
pnpm changeset
```

pick the affected packages and a semver bump, and write a short summary. On
release, `pnpm version` applies the bumps + changelogs and `pnpm release`
builds and publishes. See the changesets docs for the full flow.
