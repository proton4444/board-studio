import {
  LOW_BALANCE_THRESHOLD,
  normalizeBalanceResponse,
} from "../src/lib/providers/atlasCloudProvider";

test("normalizeBalanceResponse maps balance and currency fields", () => {
  expect(normalizeBalanceResponse({ balance: 250, currency: "USD" })).toMatchObject({
    available: 250,
    unit: "USD",
  });
});

test("normalizeBalanceResponse defaults credits unit from credits field", () => {
  expect(normalizeBalanceResponse({ credits: 50 })).toMatchObject({
    available: 50,
    unit: "credits",
  });
});

test("normalizeBalanceResponse unwraps a data envelope", () => {
  expect(normalizeBalanceResponse({ data: { available: 10 } })).toMatchObject({
    available: 10,
    unit: "credits",
  });
});

test("normalizeBalanceResponse honors available_credits and unit", () => {
  expect(normalizeBalanceResponse({ available_credits: 999, unit: "tokens" })).toMatchObject({
    available: 999,
    unit: "tokens",
  });
});

test("normalizeBalanceResponse supports zero remaining balance", () => {
  expect(normalizeBalanceResponse({ remaining: 0 })).toMatchObject({
    available: 0,
    unit: "credits",
  });
});

test("normalizeBalanceResponse returns null for non-object values", () => {
  expect(normalizeBalanceResponse("not an object")).toBeNull();
});

test("normalizeBalanceResponse returns null when no numeric balance field exists", () => {
  expect(normalizeBalanceResponse({})).toBeNull();
});

test("LOW_BALANCE_THRESHOLD remains 100", () => {
  expect(LOW_BALANCE_THRESHOLD).toBe(100);
});

test("balances below the low-balance threshold compare as low", () => {
  const balance = normalizeBalanceResponse({ balance: 99 });

  expect(balance).not.toBeNull();
  expect(balance!.available < LOW_BALANCE_THRESHOLD).toBe(true);
});

test("balances at the threshold compare as not low", () => {
  const balance = normalizeBalanceResponse({ balance: 100 });

  expect(balance).not.toBeNull();
  expect(balance!.available >= LOW_BALANCE_THRESHOLD).toBe(true);
});
