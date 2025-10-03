export interface SecondaryPricingTiers {
  basePrice: number; // قیمت اصلی
  leaderPrices: {
    with1Friend: number; // basePrice
    with2Friends: number; // basePrice * 0.667
    with3Friends: number; // basePrice * 0.334
    with4Friends: number; // 0
  };
  inviteePrice: number; // basePrice
}


