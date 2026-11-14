#!/usr/bin/env bash
set -euo pipefail

: "${VERSION:?release version required}"
: "${PRERELEASE:?prerelease flag required}"
[[ "${VERSION}" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)(-[0-9A-Za-z.-]+)?$ ]] || exit 1
major=${BASH_REMATCH[1]}
minor=${BASH_REMATCH[2]}
source=$(git rev-parse HEAD)
refs=$(git ls-remote origin refs/heads/actions "refs/tags/v${VERSION}" "refs/tags/v${major}" "refs/tags/v${major}.${minor}")
remote_oid() { awk -v ref="$1" '$2 == ref { print $1 }' <<<"${refs}"; }
[[ -z "$(remote_oid "refs/tags/v${VERSION}")" ]] || {
	echo "version tag already exists" >&2
	exit 1
}

parents=(-p "${source}")
previous=$(remote_oid refs/heads/actions)
if [[ -n "${previous}" ]]; then
	git fetch --no-tags origin "${previous}"
	previous_source=$(git rev-parse "${previous}^1")
	git merge-base --is-ancestor "${previous_source}" "${source}"
	parents+=(-p "${previous}")
fi

if [[ "${PRERELEASE}" != true ]]; then
	latest=$(git tag --list --sort=-version:refname | sed -nE '/^v[0-9]+\.[0-9]+\.[0-9]+$/p' | head -n 1)
	if [[ -n "${latest}" && "$(printf '%s\n' "${latest#v}" "${VERSION}" | sort -V | tail -n 1)" != "${VERSION}" ]]; then
		echo "refusing to move stable aliases backwards from ${latest}" >&2
		exit 1
	fi
fi

index_dir=$(mktemp -d)
trap 'rm -rf "${index_dir}"' EXIT
export GIT_INDEX_FILE="${index_dir}/index"
git --work-tree=release add -A
tree=$(git write-tree)
unset GIT_INDEX_FILE
commit=$(git commit-tree "${tree}" "${parents[@]}" -m "actions-shells v${VERSION}" -m "Built from ${source}.")
git tag -a "v${VERSION}" -m "actions-shells v${VERSION}" "${commit}"
leases=("--force-with-lease=refs/heads/actions:${previous}" "--force-with-lease=refs/tags/v${VERSION}:")
push_refs=("${commit}:refs/heads/actions" "refs/tags/v${VERSION}")
if [[ "${PRERELEASE}" != true ]]; then
	for alias in "v${major}.${minor}" "v${major}"; do
		git tag -f -a "${alias}" -m "actions-shells ${alias} -> v${VERSION}" "${commit}"
		leases+=("--force-with-lease=refs/tags/${alias}:$(remote_oid "refs/tags/${alias}")")
		push_refs+=("refs/tags/${alias}")
	done
fi
git push --atomic "${leases[@]}" origin "${push_refs[@]}"
echo "commit=${commit}" >>"${GITHUB_OUTPUT}"
