#!/bin/sh
# Installs the repo's git hooks. Wired to npm's `prepare`, so `npm install`
# fetches them into a fresh clone without anyone remembering to.
#
# Hooks live in .git/hooks, which git refuses to version — so they cannot simply
# be committed, and a clone starts with none. This copies them in.
#
# The pre-commit hook only catches commits made on this machine. The GitHub web
# UI writes blobs server-side and never runs it, which is how a .env full of live
# credentials reached this repo repeatedly. .github/workflows/secrets-guard.yml
# is the net for that path; this one just makes the local mistake cheap to catch.

set -e

root=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "  not a git repository — skipping hook install"
  exit 0
}

# CI checks out without hooks and does not commit; installing there is noise.
[ -n "$CI" ] && exit 0

hooks_dir="$root/.git/hooks"
mkdir -p "$hooks_dir"

cat > "$hooks_dir/pre-commit" <<'HOOK'
#!/bin/sh
# Refuses to commit an environment file. Bypass with --no-verify if you are
# certain (you almost never are — .env.example is the file you want).

staged=$(git diff --cached --name-only --diff-filter=AM | grep -E '^\.env' | grep -v '^\.env\.example$' || true)

if [ -n "$staged" ]; then
  echo
  echo "  BLOCKED  staged environment file(s):"
  echo "$staged" | sed 's/^/           /'
  echo
  echo "  These hold live credentials. Put values in Vercel's environment"
  echo "  variables instead: Project -> Settings -> Environment Variables."
  echo
  echo "  Document new keys by adding them to .env.example with empty values."
  echo
  exit 1
fi
HOOK

chmod +x "$hooks_dir/pre-commit"
echo "  git hooks installed (pre-commit: blocks .env)"
