# Development

Tasks run with [Task](https://taskfile.dev/). `task --list` shows them all.

## Prepare Dev Environment

Install the dev dependencies and link the scripts into `http-root/`:

`task init`

## Building new version

Edit `vxpay-iframe.js` only; the other `vxpay-iframe*.js` files are generated.

`task build` lints `vxpay-iframe.js`, writes the `package.json` version into its `@version` comment and regenerates
`vxpay-iframe-api.min.js`, `vxpay-iframe.min.js`, `vxpay-iframe-dev.js` and `vxpay-iframe.esm.js`.

### Release new API version

Commit your changes first, then:

`task release VERSION=1.5.58`

It pulls, sets the version in `package.json`, builds, packs `dist/VXPaymentApi-<version>.tgz`, commits "Api build" and
tags the version. Then push the commit and the tag:

`task push`

The new version can then be deployed in other depending projects or `vxpayment-v3` - see README there.
