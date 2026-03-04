#!/usr/bin/env bash
set -euo pipefail

# Installs sops on Linux/macOS runners without relying on apt/brew availability.
SOPS_VERSION="${SOPS_VERSION:-3.10.2}"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"
OS="$(uname -s)"
ARCH="$(uname -m)"

case "${OS}" in
  Linux) os_name="linux" ;;
  Darwin) os_name="darwin" ;;
  *)
    echo "Unsupported OS: ${OS}"
    exit 1
    ;;
esac

case "${ARCH}" in
  x86_64|amd64) arch_name="amd64" ;;
  arm64|aarch64) arch_name="arm64" ;;
  *)
    echo "Unsupported architecture: ${ARCH}"
    exit 1
    ;;
esac

url="https://github.com/getsops/sops/releases/download/v${SOPS_VERSION}/sops-v${SOPS_VERSION}.${os_name}.${arch_name}"
tmp_bin="$(mktemp)"

echo "Installing sops v${SOPS_VERSION} from ${url}"
curl -fsSL "${url}" -o "${tmp_bin}"
chmod +x "${tmp_bin}"

if [[ -w "${INSTALL_DIR}" ]]; then
  mv "${tmp_bin}" "${INSTALL_DIR}/sops"
else
  sudo mv "${tmp_bin}" "${INSTALL_DIR}/sops"
fi

echo "sops installed at ${INSTALL_DIR}/sops"
sops --version

