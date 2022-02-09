# Development

## Prepare Dev Environment

This task initializes the project, loading all dependencies etc.

`ant dev`

## Building new version

As soon, as you've completed all the changes, it's time to release a new version.

### Release new API version - run release task
- it runs syntax and code checks
- runs unit tests and frontend tests (karma)
- minifies javascript
- updates current API version from the current git version tag 

Jus type:

`ant release`

Then you'll be shown the current version and can enter a new version tag.

Afterwards, just push all the changes, as shown in the last hint from the `release` task.

`git push; git push --tags`

The new version can then be deployed in other depending projects or `vxpayment-v3` - see README there.