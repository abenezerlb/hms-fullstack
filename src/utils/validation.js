/**
 * Form Validation Utilities
 */

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone) => {
  const re = /^[\d\s\-\+\(\)]+$/;
  return re.test(phone) && phone.replace(/\D/g, "").length >= 10;
};

export const validateRequired = (value) => {
  return value !== null && value !== undefined && String(value).trim().length > 0;
};

export const validateMinLength = (value, min) => {
  return String(value).length >= min;
};

export const validateMaxLength = (value, max) => {
  return String(value).length <= max;
};

export const validateDate = (date) => {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d);
};

export const validateAge = (dateOfBirth) => {
  if (!validateDate(dateOfBirth)) return false;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 && age <= 150;
};

export const validateCardNumber = (cardNumber) => {
  const cleaned = cardNumber.replace(/\s/g, "");
  return /^\d{13,19}$/.test(cleaned);
};

export const validateCVV = (cvv) => {
  return /^\d{3,4}$/.test(cvv);
};

export const validateExpiryDate = (expiry) => {
  const cleaned = expiry.replace(/\s/g, "");
  if (!/^\d{2}\/\d{2}$/.test(cleaned)) return false;
  
  const [month, year] = cleaned.split("/");
  const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
  const today = new Date();
  return expiryDate > today;
};

export const validateAmount = (amount) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && num <= 100000;
};

// Patient form validation
export const validatePatientForm = (data) => {
  const errors = {};

  if (!validateRequired(data.firstName)) {
    errors.firstName = "First name is required";
  }

  if (!validateRequired(data.lastName)) {
    errors.lastName = "Last name is required";
  }

  if (!validateRequired(data.dateOfBirth)) {
    errors.dateOfBirth = "Date of birth is required";
  } else if (!validateAge(data.dateOfBirth)) {
    errors.dateOfBirth = "Invalid date of birth";
  }

  if (!validateRequired(data.gender)) {
    errors.gender = "Gender is required";
  }

  if (!validateRequired(data.phone)) {
    errors.phone = "Phone number is required";
  } else if (!validatePhone(data.phone)) {
    errors.phone = "Invalid phone number";
  }

  if (data.email && !validateEmail(data.email)) {
    errors.email = "Invalid email address";
  }

  if (data.insuranceNumber && !validateRequired(data.insuranceNumber)) {
    errors.insuranceNumber = "Insurance number is required if provider is provided";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Payment form validation
export const validatePaymentForm = (data) => {
  const errors = {};

  if (!validateRequired(data.amount)) {
    errors.amount = "Amount is required";
  } else if (!validateAmount(data.amount)) {
    errors.amount = "Invalid amount";
  }

  if (data.paymentMethod === "card") {
    if (!validateRequired(data.cardNumber)) {
      errors.cardNumber = "Card number is required";
    } else if (!validateCardNumber(data.cardNumber)) {
      errors.cardNumber = "Invalid card number";
    }

    if (!validateRequired(data.cardName)) {
      errors.cardName = "Cardholder name is required";
    }

    if (!validateRequired(data.expiryDate)) {
      errors.expiryDate = "Expiry date is required";
    } else if (!validateExpiryDate(data.expiryDate)) {
      errors.expiryDate = "Invalid or expired date";
    }

    if (!validateRequired(data.cvv)) {
      errors.cvv = "CVV is required";
    } else if (!validateCVV(data.cvv)) {
      errors.cvv = "Invalid CVV";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

