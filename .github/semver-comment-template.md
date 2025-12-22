# Semantic Version Comment Template

When opening or updating a pull request, please add a comment indicating the semantic version impact of your changes.

## Format

Use one of the following commands in a comment on your pull request:

- `/semver: patch` - For bug fixes and minor changes that don't change existing functionality
- `/semver: minor` - For new features that are backward compatible
- `/semver: major` - For breaking changes that require users to update their code

## Examples

### Patch Version (Bug Fix)
```
/semver: patch
```
Use for:
- Bug fixes
- Documentation updates
- Internal refactoring
- Performance improvements
- Security patches

### Minor Version (New Feature)
```
/semver: minor
```
Use for:
- New features
- New API endpoints
- New configuration options
- Deprecation notices (without removal)

### Major Version (Breaking Change)
```
/semver: major
```
Use for:
- Breaking API changes
- Removing deprecated features
- Changes that require user action
- Database schema changes
- Configuration format changes

## Full Comment Examples

### Example 1: Bug Fix
```
This PR fixes a memory leak in the scanner service.

/semver: patch
```

### Example 2: New Feature
```
Adds support for new ROM formats (.chd, .iso).

/semver: minor
```

### Example 3: Breaking Change
```
Removes the profileId field from manifests. All existing manifests need to be regenerated.

/semver: major
```

## Notes

- The semver comment can be added at any time during the PR review process
- Only one semver directive is needed per PR
- The workflow will automatically check for this comment and fail if it's missing
- You can update your semver comment if the scope of changes evolves

