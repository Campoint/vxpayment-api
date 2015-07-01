# Development

## Prepare Dev Environment

## Building new version

### Release new API version - run build task
- runs syntax and code checks
- runs unit tests and frontend tests (karma)
- minifies javascript
- updates current API version from the current git version tag 

1) tag the new version (after merging feature to master e.g.)

git tag X.Y.Z

2) run build process

ant build

