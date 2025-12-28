#!/usr/bin/env bash

# Release creation script for Jacare
# Usage: ./scripts/create-release.sh v1.0.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if version argument is provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: Version tag required${NC}"
  echo "Usage: $0 <version>"
  echo "Example: $0 v1.0.0"
  exit 1
fi

VERSION="$1"

# Validate version format (vX.Y.Z or vX.Y.Z-suffix)
if ! [[ "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  echo -e "${RED}Error: Invalid version format${NC}"
  echo "Version must be in format: vX.Y.Z or vX.Y.Z-suffix"
  echo "Examples: v1.0.0, v1.2.3, v1.0.0-beta.1"
  exit 1
fi

echo -e "${GREEN}Creating release ${VERSION}${NC}\n"

# Check if tag already exists
if git rev-parse "$VERSION" >/dev/null 2>&1; then
  echo -e "${RED}Error: Tag ${VERSION} already exists${NC}"
  echo "To delete the tag, run:"
  echo "  git tag -d ${VERSION}"
  echo "  git push origin :refs/tags/${VERSION}"
  exit 1
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo -e "${YELLOW}Warning: You are not on the main branch${NC}"
  echo "Current branch: ${CURRENT_BRANCH}"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
  fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo -e "${RED}Error: You have uncommitted changes${NC}"
  echo "Please commit or stash your changes before creating a release."
  exit 1
fi

# Pull latest changes
echo -e "${GREEN}Pulling latest changes...${NC}"
git pull origin main

# Run pre-release checks
echo -e "${GREEN}Running pre-release checks...${NC}"

echo "  → Type checking..."
if ! npm run typecheck > /dev/null 2>&1; then
  echo -e "${RED}Error: Type check failed${NC}"
  echo "Run 'npm run typecheck' to see the errors"
  exit 1
fi

echo "  → Linting..."
if ! npm run lint > /dev/null 2>&1; then
  echo -e "${RED}Error: Lint failed${NC}"
  echo "Run 'npm run lint' to see the errors"
  exit 1
fi

echo "  → Unit tests..."
if ! npm run test:unit > /dev/null 2>&1; then
  echo -e "${RED}Error: Tests failed${NC}"
  echo "Run 'npm run test:unit' to see the failures"
  exit 1
fi

echo -e "${GREEN}All checks passed!${NC}\n"

# Confirm release
echo -e "${YELLOW}Ready to create release ${VERSION}${NC}"
echo "This will:"
echo "  1. Create an annotated tag ${VERSION}"
echo "  2. Push the tag to origin"
echo "  3. Trigger the release workflow"
echo ""
read -p "Proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

# Create and push tag
echo -e "${GREEN}Creating tag ${VERSION}...${NC}"
git tag -a "$VERSION" -m "Release ${VERSION}"

echo -e "${GREEN}Pushing tag to origin...${NC}"
git push origin "$VERSION"

echo ""
echo -e "${GREEN}✓ Release ${VERSION} created successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Monitor the workflow at: https://github.com/luandev/jacare/actions"
echo "  2. Once complete, verify the release at: https://github.com/luandev/jacare/releases"
echo ""
