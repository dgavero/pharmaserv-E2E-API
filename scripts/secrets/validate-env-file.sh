#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-}"
shift || true
DEFAULT_KEYS_FILE="scripts/secrets/required-credentials.txt"

if [[ -z "${ENV_FILE}" ]]; then
  echo "Usage: $0 <env-file> <KEY> [KEY ...]"
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing env file: ${ENV_FILE}"
  exit 1
fi

if [[ "$#" -eq 0 ]]; then
  if [[ ! -f "${DEFAULT_KEYS_FILE}" ]]; then
    echo "No keys provided and default key file is missing: ${DEFAULT_KEYS_FILE}"
    exit 1
  fi

  # Load non-empty, non-comment lines from the default keys file.
  default_keys=()
  while IFS= read -r line; do
    default_keys+=("${line}")
  done < <(grep -Ev '^[[:space:]]*(#|$)' "${DEFAULT_KEYS_FILE}" || true)
  if [[ "${#default_keys[@]}" -eq 0 ]]; then
    echo "No keys provided and default key list is empty: ${DEFAULT_KEYS_FILE}"
    exit 1
  fi

  set -- "${default_keys[@]}"
fi

missing=0
for key in "$@"; do
  line="$(grep -m1 "^${key}=" "${ENV_FILE}" || true)"
  if [[ -z "${line}" ]]; then
    echo "Missing required credential variable: ${key}"
    missing=1
    continue
  fi

  value="${line#*=}"
  value="${value%$'\r'}"
  if [[ -z "${value}" ]]; then
    echo "Missing required credential variable: ${key}"
    missing=1
  fi
done

if [[ "${missing}" -ne 0 ]]; then
  exit 1
fi
