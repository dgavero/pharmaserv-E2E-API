import fs from 'fs';
import path from 'path';

const selectorCache = new Map();

/**
 * Load selectors JSON by name.
 * Example: loadSelectors('merchant') -> e2e/selectors/merchant.selectors.json
 */
export function loadSelectors(name) {
  if (selectorCache.has(name)) {
    return selectorCache.get(name);
  }

  const filePath = path.resolve(process.cwd(), 'e2e', 'selectors', `${name}.selectors.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Selectors file not found: ${filePath}`);
  }

  const selectors = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  selectorCache.set(name, selectors);
  return selectors;
}

/**
 * Get selector by dot-path.
 * Example: getSelector(selectors, 'Login.Username')
 */
export function getSelector(selectors, selectorPath) {
  const parts = selectorPath.split('.');
  let current = selectors;

  for (const part of parts) {
    if (!current || typeof current !== 'object' || !(part in current)) {
      throw new Error(`Selector not found: ${selectorPath}`);
    }
    current = current[part];
  }

  return current;
}
