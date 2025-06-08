import { calculateInitialGroupPriceAndFreeThreshold, calculateGroupPrice } from '../priceCalculator';

describe('calculateInitialGroupPriceAndFreeThreshold', () => {
  it('returns correct price and threshold for ratio < 1.3', () => {
    const { price, freeThreshold } = calculateInitialGroupPriceAndFreeThreshold(100, 120);
    expect(price).toBeCloseTo(105);
    expect(freeThreshold).toBe(20);
  });

  it('returns correct price and threshold for ratio between 1.5 and 1.8', () => {
    const { price, freeThreshold } = calculateInitialGroupPriceAndFreeThreshold(100, 160);
    expect(price).toBeCloseTo(120);
    expect(freeThreshold).toBe(5);
  });

  it('returns correct price and threshold for ratio >= 3', () => {
    const { price, freeThreshold } = calculateInitialGroupPriceAndFreeThreshold(100, 400);
    expect(price).toBeCloseTo(150);
    expect(freeThreshold).toBe(2);
  });
});

describe('calculateGroupPrice', () => {
  it('applies invitee discount correctly', () => {
    const price = calculateGroupPrice(100, 160, 2); // threshold should be 5
    expect(price).toBeCloseTo(60);
  });

  it('returns free when invitee count meets threshold', () => {
    const price = calculateGroupPrice(100, 160, 5); // threshold is 5
    expect(price).toBe(0);
  });
});
