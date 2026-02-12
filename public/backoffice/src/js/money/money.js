/**
 * Money Math Operations
 * USD (2 decimal places) and USDT (6 decimal places)
 * Never mix currencies - strict currency handling
 */

class Money {
  constructor() {
    this.USD_PRECISION = 2;
    this.USDT_PRECISION = 6;
    this.USD_MULTIPLIER = Math.pow(10, this.USD_PRECISION);
    this.USDT_MULTIPLIER = Math.pow(10, this.USDT_PRECISION);
  }

  // Create money object with validation
  create(amount, currency) {
    if (!['USD', 'USDT'].includes(currency)) {
      throw new Error(`Unsupported currency: ${currency}. Only USD and USDT are supported.`);
    }

    const precision = currency === 'USD' ? this.USD_PRECISION : this.USDT_PRECISION;
    const multiplier = currency === 'USD' ? this.USD_MULTIPLIER : this.USDT_MULTIPLIER;

    // Convert to cents/sats to avoid floating point issues
    let normalizedAmount;
    
    if (typeof amount === 'string') {
      // Remove currency symbols and commas
      const cleanAmount = amount.replace(/[$,]/g, '').trim();
      normalizedAmount = parseFloat(cleanAmount);
    } else if (typeof amount === 'number') {
      normalizedAmount = amount;
    } else {
      throw new Error('Amount must be a string or number');
    }

    if (isNaN(normalizedAmount) || !isFinite(normalizedAmount)) {
      throw new Error(`Invalid amount: ${amount}`);
    }

    if (normalizedAmount < 0) {
      throw new Error('Amount cannot be negative');
    }

    // Round to appropriate precision and convert to integer
    const integerAmount = Math.round(normalizedAmount * multiplier);

    return {
      amount: integerAmount,
      currency,
      precision,
      multiplier
    };
  }

  // Convert integer amount back to decimal string
  toDecimal(money) {
    if (!money || typeof money.amount !== 'number' || !money.currency) {
      throw new Error('Invalid money object');
    }

    const decimal = (money.amount / money.multiplier).toFixed(money.precision);
    return decimal;
  }

  // Format for display with currency symbol
  format(money, options = {}) {
    const {
      showSymbol = true,
      showCode = false,
      locale = 'en-US'
    } = options;

    const decimal = this.toDecimal(money);
    const number = parseFloat(decimal);

    if (money.currency === 'USD') {
      const formatted = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: money.precision,
        maximumFractionDigits: money.precision
      }).format(number);

      if (showCode) {
        return `${formatted} ${money.currency}`;
      }
      return formatted;
    } else if (money.currency === 'USDT') {
      // USDT doesn't have standard Intl formatting
      let result = decimal;
      if (showSymbol) {
        result = `₮${result}`;
      }
      if (showCode) {
        result += ` ${money.currency}`;
      }
      return result;
    }

    return decimal;
  }

  // Add two money objects (must be same currency)
  add(money1, money2) {
    this.validateSameCurrency(money1, money2);
    
    return {
      amount: money1.amount + money2.amount,
      currency: money1.currency,
      precision: money1.precision,
      multiplier: money1.multiplier
    };
  }

  // Subtract money2 from money1 (must be same currency)
  subtract(money1, money2) {
    this.validateSameCurrency(money1, money2);
    
    const result = money1.amount - money2.amount;
    if (result < 0) {
      throw new Error('Result cannot be negative');
    }

    return {
      amount: result,
      currency: money1.currency,
      precision: money1.precision,
      multiplier: money1.multiplier
    };
  }

  // Multiply money by a factor
  multiply(money, factor) {
    if (typeof factor !== 'number' || isNaN(factor) || !isFinite(factor)) {
      throw new Error('Factor must be a valid number');
    }

    if (factor < 0) {
      throw new Error('Factor cannot be negative');
    }

    const result = Math.round(money.amount * factor);
    
    return {
      amount: result,
      currency: money.currency,
      precision: money.precision,
      multiplier: money.multiplier
    };
  }

  // Divide money by a factor
  divide(money, factor) {
    if (typeof factor !== 'number' || isNaN(factor) || !isFinite(factor)) {
      throw new Error('Factor must be a valid number');
    }

    if (factor <= 0) {
      throw new Error('Factor must be positive');
    }

    const result = Math.round(money.amount / factor);
    
    return {
      amount: result,
      currency: money.currency,
      precision: money.precision,
      multiplier: money.multiplier
    };
  }

  // Compare two money objects
  compare(money1, money2) {
    this.validateSameCurrency(money1, money2);
    
    if (money1.amount < money2.amount) return -1;
    if (money1.amount > money2.amount) return 1;
    return 0;
  }

  // Check if money1 equals money2
  equals(money1, money2) {
    return this.compare(money1, money2) === 0;
  }

  // Check if money1 is greater than money2
  greaterThan(money1, money2) {
    return this.compare(money1, money2) > 0;
  }

  // Check if money1 is less than money2
  lessThan(money1, money2) {
    return this.compare(money1, money2) < 0;
  }

  // Calculate percentage of amount
  percentage(money, percent) {
    if (typeof percent !== 'number' || isNaN(percent) || !isFinite(percent)) {
      throw new Error('Percent must be a valid number');
    }

    if (percent < 0 || percent > 100) {
      throw new Error('Percent must be between 0 and 100');
    }

    return this.multiply(money, percent / 100);
  }

  // Calculate percentage that money1 is of money2
  percentageOf(money1, money2) {
    this.validateSameCurrency(money1, money2);
    
    if (money2.amount === 0) {
      throw new Error('Cannot calculate percentage of zero');
    }

    return (money1.amount / money2.amount) * 100;
  }

  // Round to nearest unit (dollar for USD, whole USDT for USDT)
  round(money) {
    const unit = money.multiplier;
    const rounded = Math.round(money.amount / unit) * unit;
    
    return {
      amount: rounded,
      currency: money.currency,
      precision: money.precision,
      multiplier: money.multiplier
    };
  }

  // Round up to nearest unit
  ceil(money) {
    const unit = money.multiplier;
    const rounded = Math.ceil(money.amount / unit) * unit;
    
    return {
      amount: rounded,
      currency: money.currency,
      precision: money.precision,
      multiplier: money.multiplier
    };
  }

  // Round down to nearest unit
  floor(money) {
    const unit = money.multiplier;
    const rounded = Math.floor(money.amount / unit) * unit;
    
    return {
      amount: rounded,
      currency: money.currency,
      precision: money.precision,
      multiplier: money.multiplier
    };
  }

  // Validate that two money objects have the same currency
  validateSameCurrency(money1, money2) {
    if (!money1 || !money2) {
      throw new Error('Both money objects must be provided');
    }

    if (money1.currency !== money2.currency) {
      throw new Error(`Cannot mix currencies: ${money1.currency} and ${money2.currency}`);
    }
  }

  // Parse string input and create money object
  parse(input, currency) {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    // Extract number from string (handles $1,234.56, ₮1.234567, etc.)
    const numberMatch = input.match(/[\d,]+\.?\d*/);
    if (!numberMatch) {
      throw new Error(`Could not parse amount from: ${input}`);
    }

    const amount = parseFloat(numberMatch[0].replace(/,/g, ''));
    return this.create(amount, currency);
  }

  // Convert to JSON serializable format
  toJSON(money) {
    return {
      amount: this.toDecimal(money),
      currency: money.currency,
      precision: money.precision
    };
  }

  // Create from JSON format
  fromJSON(data) {
    if (!data || typeof data.amount !== 'string' || !data.currency) {
      throw new Error('Invalid JSON data for money object');
    }

    return this.create(parseFloat(data.amount), data.currency);
  }

  // Zero money object for given currency
  zero(currency) {
    if (!['USD', 'USDT'].includes(currency)) {
      throw new Error(`Unsupported currency: ${currency}`);
    }

    const precision = currency === 'USD' ? this.USD_PRECISION : this.USDT_PRECISION;
    const multiplier = currency === 'USD' ? this.USD_MULTIPLIER : this.USDT_MULTIPLIER;

    return {
      amount: 0,
      currency,
      precision,
      multiplier
    };
  }

  // Check if money is zero
  isZero(money) {
    return money.amount === 0;
  }

  // Get currency symbol
  getSymbol(currency) {
    switch (currency) {
      case 'USD':
        return '$';
      case 'USDT':
        return '₮';
      default:
        throw new Error(`Unsupported currency: ${currency}`);
    }
  }

  // Validate money object
  validate(money) {
    if (!money || typeof money !== 'object') {
      throw new Error('Money must be an object');
    }

    if (typeof money.amount !== 'number' || !isFinite(money.amount)) {
      throw new Error('Money amount must be a finite number');
    }

    if (!['USD', 'USDT'].includes(money.currency)) {
      throw new Error(`Unsupported currency: ${money.currency}`);
    }

    if (money.amount < 0) {
      throw new Error('Money amount cannot be negative');
    }

    const expectedPrecision = money.currency === 'USD' ? this.USD_PRECISION : this.USDT_PRECISION;
    if (money.precision !== expectedPrecision) {
      throw new Error(`Invalid precision for ${money.currency}: expected ${expectedPrecision}, got ${money.precision}`);
    }

    return true;
  }
}

// Initialize global money utility
window.Money = new Money();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Money;
}
