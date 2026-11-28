# Disabled workflows

GitHub only runs workflows in `.github/workflows`; the ones in this directory are kept for reference.

- `ci.yml`: format check, lint, type check, tests and production build. The local hooks in `.husky` run these checks
  except for the production build, which `release.sh` does.
- `release.yml`: builds a zip and publishes a GitHub release on every `v*` tag. The Admin GUI is only shipped with the
  SmartHomeNG core, in `modules/admin/webif/static`.

To enable a workflow again, move it back to `.github/workflows`. Both use Node 22 (npm 10), whose `npm ci` rejects a
`package-lock.json` written by npm 11; Node 24 comes with npm 11.
