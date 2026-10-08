import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateHealing, rankCandidates } from '../src/healer';

const SNAPSHOT = [
  '- button "Proceed to checkout"',
  '- textbox "Email address"',
  '- link "View cart"',
  '<button data-testid="checkout-cta">Checkout</button>',
  '<label for="email-input">Email</label>',
].join('\n');

// Selector `#checkout` aligns with the observed button name + testid → HIGH tier.
const HIGH_BASE = {
  testFile: 'tests/checkout.spec.ts',
  testName: 'guest checkout completes',
  originalSnippet: "await page.locator('#checkout').click();\nawait expect(page.getByText('Order confirmed')).toBeVisible();",
  failedLocatorOrSelector: '#checkout',
  updatedDomOrSchema: SNAPSHOT,
  failureCategory: 'SELECTOR_FAILURE',
};

// Selector 'Submit' matches nothing in the snapshot → weaker candidate → MEDIUM tier.
const MEDIUM_BASE = {
  ...HIGH_BASE,
  originalSnippet: "await page.getByRole('button', { name: 'Submit' }).click();\nawait expect(page.getByText('Order confirmed')).toBeVisible();",
  failedLocatorOrSelector: "page.getByRole('button', { name: 'Submit' })",
};

test('rankCandidates derives candidates from the real snapshot only', () => {
  const candidates = rankCandidates(SNAPSHOT, "page.getByRole('button', { name: 'Submit' })");
  assert.ok(candidates.length > 0, 'snapshot contains interactive roles — must find them');
  const top = candidates[0];
  assert.match(top.locator, /getByRole\('button', \{ name: 'Proceed to checkout' \}\)/);
  assert.match(top.why, /aria snapshot line observed/, 'why must cite the observed snapshot line');
  const testid = candidates.find((c) => c.strategy === 'getByTestId');
  assert.ok(testid, 'data-testid anchor observed in snapshot must be ranked');
  assert.equal(testid.locator, "page.getByTestId('checkout-cta')");
  for (let i = 1; i < candidates.length; i++) {
    assert.ok(candidates[i - 1].score >= candidates[i].score, 'candidates must be score-descending');
  }
});

test('HIGH tier without a rerun callback stays proposed — never applied unverified', async () => {
  const proposal = await evaluateHealing({ ...HIGH_BASE });
  assert.equal(proposal.confidenceTier, 'HIGH');
  assert.notEqual(proposal.status, 'applied', 'no verification → no application');
  assert.equal(proposal.status, 'proposed');
  assert.equal(proposal.invariantChecks.verifiedByRerun, false);
  assert.match(proposal.rationale, /No rerun callback provided/);
});

test('HIGH tier with a FAILING rerun: engine re-runs, then demotes — no masking', async () => {
  let rerunCalls = 0;
  const proposal = await evaluateHealing({
    ...HIGH_BASE,
    rerun: () => {
      rerunCalls += 1;
      return false;
    },
  });
  assert.equal(rerunCalls, 1, 'the engine must actually re-run the patched test');
  assert.notEqual(proposal.status, 'applied');
  assert.equal(proposal.status, 'proposed');
  assert.equal(proposal.confidenceTier, 'MEDIUM', 'failed verification must demote the tier');
  assert.equal(proposal.invariantChecks.verifiedByRerun, false);
  assert.match(proposal.rationale, /Re-run verification FAILED/);
});

test('HIGH tier with a PASSING rerun: applied and marked verified', async () => {
  let receivedPatch = '';
  const proposal = await evaluateHealing({
    ...HIGH_BASE,
    rerun: (patched) => {
      receivedPatch = patched;
      return true;
    },
  });
  assert.equal(rerunCalledWith(receivedPatch), true, 'rerun receives the actual patched snippet');
  assert.equal(proposal.status, 'applied');
  assert.equal(proposal.invariantChecks.verifiedByRerun, true);
  assert.match(proposal.rationale, /Re-run verification PASSED/);
});

test('MEDIUM tier never auto-applies even when a rerun callback exists', async () => {
  let rerunCalls = 0;
  const proposal = await evaluateHealing({
    ...MEDIUM_BASE,
    rerun: () => {
      rerunCalls += 1;
      return true;
    },
  });
  assert.equal(proposal.confidenceTier, 'MEDIUM');
  assert.equal(rerunCalls, 0, 'rerun verification is a HIGH-tier gate; MEDIUM stays propose-only');
  assert.notEqual(proposal.status, 'applied');
});

test('assertions are preserved — the patch never weakens test strength', async () => {
  const proposal = await evaluateHealing({ ...HIGH_BASE });
  assert.equal(proposal.invariantChecks.assertionWeakened, false);
  assert.equal(proposal.invariantChecks.timeoutIncreased, false);
  assert.equal(proposal.invariantChecks.goldenRulesPassed, true);
  assert.match(proposal.proposedPatch, /toBeVisible\(\)/, 'the strong assertion must survive the patch');
});

test('REAL_REGRESSION blocks healing outright', async () => {
  const proposal = await evaluateHealing({ ...HIGH_BASE, failureCategory: 'REAL_REGRESSION' });
  assert.equal(proposal.status, 'blocked');
  assert.equal(proposal.confidenceTier, 'LOW');
  assert.match(proposal.rationale, /REAL_REGRESSION/);
  assert.equal(proposal.invariantChecks.regressionMasked, true, 'flag records what WOULD have happened');
});

function rerunCalledWith(patch: string): boolean {
  return patch.includes("getByRole('button', { name: 'Proceed to checkout' })");
}
