/**
 * Pricing Constants
 * All prices in Ethiopian Birr (ETB)
 */

export const PRICING = {
  PHARMACY: 300,
  LAB: 500,
  REGISTRATION: 200,
};

export const formatPrice = (amount) => {
  return `${amount.toFixed(2)} ETB`;
};

export const getPharmacyPrice = () => PRICING.PHARMACY;
export const getLabPrice = () => PRICING.LAB;
export const getRegistrationPrice = () => PRICING.REGISTRATION;

