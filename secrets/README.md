# Encrypted Test Secrets (sops + age)

This directory stores encrypted environment bundles used by CI/runtime:

- `secrets.dev.enc.json`
- `secrets.qa.enc.json`
- `secrets.prod.enc.json`

## One-time setup

1. Install local crypto tools and create a key pair (local machine):

```bash
npm run secrets:install-tools
mkdir -p ~/.config/sops/age
./.tools/bin/age-keygen -o ~/.config/sops/age/keys.txt
```

```powershell
npm run secrets:install-tools
New-Item -ItemType Directory -Force "$HOME\.config\sops\age" | Out-Null
& ".\.tools\bin\age-keygen.exe" -o "$HOME\.config\sops\age\keys.txt"
```

2. Get your public recipient from the generated key file:

```bash
grep '^# public key:' ~/.config/sops/age/keys.txt | sed 's/# public key: //'
```

```powershell
(Select-String -Path "$HOME\.config\sops\age\keys.txt" -Pattern '^# public key: ').Line -replace '^# public key: ', ''
```

3. Encrypt files from local `.env` + `.env.<env>`:

```bash
SOPS_AGE_RECIPIENTS="age1..." node scripts/secrets/build-encrypted-files.js --all
```

```powershell
$env:SOPS_AGE_RECIPIENTS='age1...'; node scripts/secrets/build-encrypted-files.js --all; Remove-Item Env:SOPS_AGE_RECIPIENTS
```

4. Commit `secrets/*.enc.json` to git.

5. Set bootstrap key in CI:

- GitHub secret: `SOPS_AGE_KEY`
- Value: full contents of `~/.config/sops/age/keys.txt`

## Runtime load

### GitHub Actions

```bash
TEST_ENV=DEV node scripts/secrets/load-secrets.js --env DEV --github-env --required
```

### Local shell export

```bash
eval "$(TEST_ENV=DEV node scripts/secrets/load-secrets.js --env DEV --shell --required)"
```

```powershell
Invoke-Expression "& { $(node scripts/secrets/load-secrets.js --env DEV --powershell --required) }"
```

Direct interactive terminal printing is blocked by default to avoid leaking decrypted values into console scrollback. Use command substitution as shown above, or pass `--allow-stdout-secrets` only when you intentionally need raw output.

To write a decrypted env file through Node CLI, pass script args after `--`:

```bash
node scripts/secrets/load-secrets.js --env DEV -- --env-file .ci-secrets.env --required
```

## Adding a New Credential (Manual Process)

Follow this exact process whenever you add or change any credential key.

1. Update local profile files with the new key:
   - `.env.dev`
   - `.env.qa`
   - `.env.prod`
   - Add in `.env` only if it is a shared non-env-specific value.

2. Rebuild encrypted bundles:

```bash
npm run secrets:encrypt
```

3. Validate decryption locally:

```bash
eval "$(TEST_ENV=DEV npm run -s secrets:load)"
```

```powershell
Invoke-Expression "& { $(npm run -s secrets:load:powershell) }"
```

4. Commit updated encrypted files (and docs/config if changed):
   - `secrets/secrets.dev.enc.json`
   - `secrets/secrets.qa.enc.json`
   - `secrets/secrets.prod.enc.json`

5. Push branch and run CI.

6. If the new key is required for tests to run, add it to the required list in:
   - `.github/workflows/tests.yml` (`Validate required credentials` step)

## Notes

- Keep payload flat (`KEY: value`), no nested JSON.
- CI only needs one bootstrap secret (`SOPS_AGE_KEY`) once encrypted files are in repo.
- Rotate secrets by regenerating encrypted files and committing the updates.
