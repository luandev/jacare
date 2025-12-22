# .github guidance

This directory documents the automation that keeps Jacare healthy and explains how to interact with it from pull requests.

## Pull request expectations
- Add a semantic version directive as a PR comment using one of: `/semver: patch`, `/semver: minor`, `/semver: major`.
- Fill out the PR template so reviewers know what changed, how it was tested, and which semver level applies.

## Workflows
- **CI (`ci.yml`):** builds, type-checks, runs unit tests, and executes Playwright end-to-end tests. Uploads reports and screenshots as artifacts.
- **Release (`release.yml`):** packages server, web, and desktop artifacts on `main` and publishes a GitHub release with changelog and README.
- **Semantic version guard (`semver-comment.yml`):** enforces the `/semver:` comment requirement on pull requests and posts guidance when missing.

When updating or adding workflows, keep permissions minimal and prefer caching for Node.js dependencies to speed up runs.
