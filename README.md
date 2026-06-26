# VXPaymentApi

Client-side iframe API for VX payment flows. It is bundled into consuming
projects (e.g. the Angular `vxpayment-v3` app).

## Development

This project uses [Task](https://taskfile.dev) as its build runner. Run
`task --list` to see all available tasks.

### Prepare dev environment

Installs dependencies and sets up `http-root/` symlinks for local serving:

    task dev

### Build

Lints, syncs the version, minifies and bundles (dev / min / esm):

    task build

### Release a new version

Pulls, bumps the version in `package.json`, runs the build, then commits and
tags:

    task release VERSION=1.5.57

Then push the commit and the tag:

    task push

Consuming projects pin this library by git tag, so the new version becomes
available to them once the tag is pushed.
