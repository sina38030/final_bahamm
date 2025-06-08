/**
 * Price calculation utilities for the Bahamm app
 */


export const calculateInitialGroupPriceAndFreeThreshold = (
  basePrice: number,
  marketPrice: number
): { price: number, freeThreshold: number } => {
  const ratio = marketPrice / basePrice;
  console.log('Market to base price ratio:', ratio);
  
  let groupPrice: number;
  let freeThreshold: number;
  
  // Intial group price and free threshold
  if (ratio < 1.3) {
    groupPrice = 1.05 * basePrice;
    freeThreshold = 20;
  } else if (ratio < 1.5) {
    groupPrice = 1.1 * basePrice;
    freeThreshold = 10;
  } else if (ratio < 1.8) {
    groupPrice = 1.2 * basePrice;
    freeThreshold = 5;
  } else if (ratio < 2) {
    groupPrice = 1.25 * basePrice;
    freeThreshold = 4;
  } else if (ratio < 3) {
    groupPrice = 1.34 * basePrice;
    freeThreshold = 3;
  } else {
    groupPrice = 1.5 * basePrice;
    freeThreshold = 2;
  }

  return { price: groupPrice, freeThreshold };
}

/**
 * Calculate the group price for buying with friends
 * @param basePrice - The base price of the product
 * @param marketPrice - The market price of the product
 * @param inviteeCount - The number of friends (defaults to 1)
 * @returns An object containing the calculated group price and free threshold
 */
export const calculateGroupPrice = (
  basePrice: number,
  marketPrice: number,
  inviteeCount: number = 1
): number => {
  // Debug logs
  console.log('calculateGroupPrice inputs:', { basePrice, marketPrice, inviteeCount: inviteeCount });
  console.log('basePrice type:', typeof basePrice);
  console.log('marketPrice type:', typeof marketPrice);
  
  const { price, freeThreshold } = calculateInitialGroupPriceAndFreeThreshold(basePrice, marketPrice);
  let groupPrice = price;
  
  // Make the product free if the invitee count matches or exceeds the free threshold
  if (inviteeCount >= freeThreshold) {
    groupPrice = 0;
  }
  else if (inviteeCount >= 2) {
    groupPrice = basePrice - (inviteeCount * (groupPrice - basePrice))
  }
  
  // Round to 2 decimal places
  groupPrice = parseFloat(groupPrice.toFixed(2));
  
  console.log('Calculation result:', { price: groupPrice, freeThreshold });
  return groupPrice;
};

/**
 * Format price as a locale string
 * @param price - The price to format
 * @returns Formatted price string
 */
export const formatPrice = (price: number): string => {
  console.log('Formatting price:', price);
  
  let formattedPrice: string;
  
  // Keep 2 decimal places but only if needed
  if (Number.isInteger(price)) {
    // If it's a whole number, don't show decimal places
    formattedPrice = price.toLocaleString('fa-IR');
  } else {
    // If it has decimal places, show up to 2
    formattedPrice = price.toLocaleString('fa-IR', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  return formattedPrice;
}; 