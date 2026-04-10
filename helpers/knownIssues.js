const TEST_ID_PATTERN = /\b(?:PHARMA|E2E)-\d+\b/;

export const knownIssueMap = {
  'PHARMA-2': 'https://topappsph.atlassian.net/browse/PHARMA-1039',
  'E2E-6': 'https://topappsph.atlassian.net/browse/PHARMA-1040',
  'E2E-2': 'https://topappsph.atlassian.net/browse/PHARMA-1056',
  'E2E-14': 'https://topappsph.atlassian.net/browse/PHARMA-1058',
};

export function extractPrimaryTestId(title) {
  const match = String(title || '').match(TEST_ID_PATTERN);
  return match ? match[0] : null;
}

export function getKnownIssueLinkByTitle(title) {
  const testId = extractPrimaryTestId(title);
  if (!testId) return null;
  const url = knownIssueMap[testId];
  if (!url) return null;
  return { testId, url };
}

export function formatKnownIssueMarkdown(title) {
  const issue = getKnownIssueLinkByTitle(title);
  if (!issue) return '';

  const ticketKey = issue.url.split('/').pop() || issue.testId;
  return `🔷 Related Issue: [${ticketKey}](${issue.url})`;
}
