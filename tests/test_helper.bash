setup_test_project() {
  TEST_PROJECT=$(mktemp -d)
  cd "$TEST_PROJECT"
  git init -q
  echo '{"name":"test-proj","version":"1.0.0","scripts":{"dev":"next dev","test":"vitest"}}' > package.json
  export MAR_ROOT
  MAR_ROOT="$(cd "$BATS_TEST_DIRNAME/../.." && pwd)"
}

teardown_test_project() {
  if [ -n "$TEST_PROJECT" ] && [ -d "$TEST_PROJECT" ]; then
    rm -rf "$TEST_PROJECT"
  fi
}
