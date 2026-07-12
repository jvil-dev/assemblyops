<!--
  Title: Release: vX.Y.Z — <short summary>   (semver: breaking→major, feature→minor, fix→patch)
  Base: main   Compare: development
  After merge: tag main `git tag -a vX.Y.Z -m "<notes>"` (user pushes the tag).
  -->

## Release Summary

Production release from `development` → `main`. <N> files changed.

### Features

- **#<id>** —

### Bug Fixes

- **#<id>** —

### Cleanup

-

### Database Migrations

  <!-- List each Prisma migration by name; note additive vs. destructive. Omit if none. -->

- `<timestamp>_<name>` —

### CI Status

- Lint & Test: ✅
- Build: ✅

## Post-Deploy Checklist

- [ ] Run `prisma migrate deploy` on production
- [ ] Verify new tables/columns exist
- [ ] Confirm required env vars/secrets set on GCP
- [ ] Smoke test critical flows
- [ ] Tag `main` with `vX.Y.Z`
