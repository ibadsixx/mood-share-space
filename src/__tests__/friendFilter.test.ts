// Friend-system filter parsing regression tests.
// Guards against the bug where the gateway client could not parse
// `or=(and(...),and(...))` groups, making friendship status queries
// silently return no rows (button reverting to "Add Friend" on refresh).

import { describe, it, expect } from 'vitest';
import { applyFilters, matchesFilterExpr } from '@/lib/gateway';

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';

const pending = { requester_id: A, receiver_id: B, status: 'pending' };
const unrelated = { requester_id: B, receiver_id: '33333333-3333-3333-3333-333333333333', status: 'accepted' };

describe('filter parsing for friendship status', () => {
  it('resolves or=(and(A==B),and(B==A)) for a pending friendship row', () => {
    const rows = [pending, unrelated];
    const result = applyFilters(rows, [
      `or=(and(requester_id.eq.${A},receiver_id.eq.${B}),and(requester_id.eq.${B},receiver_id.eq.${A}))`,
    ]);
    expect(result).toEqual([pending]);
  });

  it('returns nothing when no friendship row exists between the pair', () => {
    const rows = [unrelated];
    const result = applyFilters(rows, [
      `or=(and(requester_id.eq.${A},receiver_id.eq.${B}),and(requester_id.eq.${B},receiver_id.eq.${A}))`,
    ]);
    expect(result).toEqual([]);
  });

  it('still handles plain comma-separated or(...) conditions', () => {
    const result = applyFilters([pending, unrelated], [
      `or=(requester_id.eq.${A},receiver_id.eq.${A})`,
    ]);
    expect(result).toEqual([pending]);
  });

  it('matches a single and(...) group as a conjunction', () => {
    expect(matchesFilterExpr(`and(requester_id.eq.${A},receiver_id.eq.${B})`, pending)).toBe(true);
    expect(matchesFilterExpr(`and(requester_id.eq.${A},receiver_id.eq.${B})`, unrelated)).toBe(false);
  });

  it('supports not.negated simple conditions', () => {
    expect(matchesFilterExpr(`not.requester_id.eq.${B}`, pending)).toBe(true);
    expect(matchesFilterExpr(`not.requester_id.eq.${A}`, pending)).toBe(false);
  });
});
