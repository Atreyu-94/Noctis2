#!/usr/bin/env bash
# Shell arrays, arithmetic, parameter expansion and a here-document.
set -euo pipefail
targets=(Vega Rigel)
exposures=(12 8)
total=0
for index in "${!targets[@]}"; do
    seconds=${exposures[$index]}
    ((total += seconds))
    printf '%s: %d seconds\n' "${targets[$index]}" "$seconds"
done
cat <<REPORT
Nightly total: ${total} seconds
First target: ${targets[0]:-unknown}
REPORT
