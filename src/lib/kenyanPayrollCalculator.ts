/**
 * Kenyan Payroll Calculator
 * Implements current Kenyan statutory deductions including:
 * - PAYE (Income Tax) with graduated tax bands
 * - NSSF (Tier I & Tier II contributions)
 * - SHA (Social Health Authority, formerly NHIF)
 * - Housing Levy (Affordable Housing Levy)
 */

export interface PayrollInput {
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherTaxableAllowances: number;
  nonTaxableAllowances: number;
  overtimePay: number;
  bonus: number;
  otherDeductions: number;
  insuranceRelief?: number;
}

export interface PayrollOutput {
  grossPay: number;
  taxableIncome: number;
  paye: number;
  nssfEmployee: number;
  nssfEmployer: number;
  shaDeduction: number;
  housingLevyEmployee: number;
  housingLevyEmployer: number;
  personalRelief: number;
  insuranceRelief: number;
  totalDeductions: number;
  netPay: number;
  breakdown: PayrollBreakdown;
}

export interface PayrollBreakdown {
  earnings: {
    basicSalary: number;
    housingAllowance: number;
    transportAllowance: number;
    otherTaxableAllowances: number;
    nonTaxableAllowances: number;
    overtimePay: number;
    bonus: number;
  };
  deductions: {
    paye: number;
    nssfEmployee: number;
    shaDeduction: number;
    housingLevyEmployee: number;
    otherDeductions: number;
  };
  employerContributions: {
    nssfEmployer: number;
    housingLevyEmployer: number;
  };
}

// 2024 PAYE Tax Bands (Monthly)
const PAYE_BANDS = [
  { min: 0, max: 24000, rate: 0.10 },
  { min: 24001, max: 32333, rate: 0.25 },
  { min: 32334, max: 500000, rate: 0.30 },
  { min: 500001, max: 800000, rate: 0.325 },
  { min: 800001, max: Infinity, rate: 0.35 },
];

// Monthly Personal Relief
const PERSONAL_RELIEF = 2400;

// Maximum Insurance Relief (monthly)
const MAX_INSURANCE_RELIEF = 5000;

// NSSF Contribution Rates (2024)
const NSSF_TIER_I_LIMIT = 7000; // Pensionable earnings limit for Tier I
const NSSF_TIER_II_LIMIT = 36000; // Pensionable earnings limit for Tier II
const NSSF_RATE = 0.06; // 6% contribution rate

// SHA Rate (2.75% of gross salary)
const SHA_RATE = 0.0275;

// Housing Levy (1.5% of gross salary)
const HOUSING_LEVY_RATE = 0.015;

/**
 * Calculate PAYE using graduated tax bands
 */
export function calculatePAYE(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;

  let tax = 0;
  let remainingIncome = taxableIncome;

  for (const band of PAYE_BANDS) {
    if (remainingIncome <= 0) break;

    const bandWidth = band.max === Infinity ? remainingIncome : Math.min(band.max - band.min + 1, remainingIncome);
    
    if (taxableIncome > band.min) {
      const taxableInBand = Math.min(remainingIncome, bandWidth);
      tax += taxableInBand * band.rate;
      remainingIncome -= taxableInBand;
    }
  }

  return Math.max(0, Math.round(tax * 100) / 100);
}

/**
 * Calculate NSSF contributions (Tier I & Tier II)
 */
export function calculateNSSF(grossPay: number): { employee: number; employer: number } {
  // NSSF is calculated on pensionable earnings (basic salary + some allowances)
  // Using gross pay as pensionable earnings for simplicity
  const pensionableEarnings = Math.min(grossPay, NSSF_TIER_II_LIMIT);
  
  // Tier I contribution (on first KES 7,000)
  const tierI = Math.min(pensionableEarnings, NSSF_TIER_I_LIMIT) * NSSF_RATE;
  
  // Tier II contribution (on earnings between KES 7,001 and KES 36,000)
  const tierII = Math.max(0, Math.min(pensionableEarnings, NSSF_TIER_II_LIMIT) - NSSF_TIER_I_LIMIT) * NSSF_RATE;
  
  const totalContribution = Math.round((tierI + tierII) * 100) / 100;
  
  return {
    employee: totalContribution,
    employer: totalContribution, // Employer matches employee contribution
  };
}

/**
 * Calculate SHA deduction (formerly NHIF)
 */
export function calculateSHA(grossPay: number): number {
  // SHA is 2.75% of gross salary
  return Math.round(grossPay * SHA_RATE * 100) / 100;
}

/**
 * Calculate Housing Levy (Affordable Housing Levy)
 */
export function calculateHousingLevy(grossPay: number): { employee: number; employer: number } {
  const levy = Math.round(grossPay * HOUSING_LEVY_RATE * 100) / 100;
  return {
    employee: levy,
    employer: levy, // Employer matches employee contribution
  };
}

/**
 * Main payroll calculation function
 */
export function calculatePayroll(input: PayrollInput): PayrollOutput {
  // Calculate Gross Pay
  const grossPay = 
    input.basicSalary +
    input.housingAllowance +
    input.transportAllowance +
    input.otherTaxableAllowances +
    input.nonTaxableAllowances +
    input.overtimePay +
    input.bonus;

  // Calculate taxable income (exclude non-taxable allowances)
  const taxableGross = grossPay - input.nonTaxableAllowances;

  // Calculate NSSF (deductible from taxable income)
  const nssf = calculateNSSF(taxableGross);

  // Calculate Housing Levy (employee portion is deductible)
  const housingLevy = calculateHousingLevy(grossPay);

  // Taxable income after NSSF and Housing Levy deductions
  const taxableIncome = taxableGross - nssf.employee - housingLevy.employee;

  // Calculate PAYE on taxable income
  const grossPAYE = calculatePAYE(taxableIncome);

  // Apply reliefs
  const insuranceRelief = Math.min(input.insuranceRelief || 0, MAX_INSURANCE_RELIEF);
  const paye = Math.max(0, grossPAYE - PERSONAL_RELIEF - insuranceRelief);

  // Calculate SHA
  const shaDeduction = calculateSHA(grossPay);

  // Total deductions
  const totalDeductions = 
    paye +
    nssf.employee +
    shaDeduction +
    housingLevy.employee +
    input.otherDeductions;

  // Net Pay (prevent negative)
  const netPay = Math.max(0, grossPay - totalDeductions);

  return {
    grossPay: Math.round(grossPay * 100) / 100,
    taxableIncome: Math.round(taxableIncome * 100) / 100,
    paye: Math.round(paye * 100) / 100,
    nssfEmployee: nssf.employee,
    nssfEmployer: nssf.employer,
    shaDeduction,
    housingLevyEmployee: housingLevy.employee,
    housingLevyEmployer: housingLevy.employer,
    personalRelief: PERSONAL_RELIEF,
    insuranceRelief,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netPay: Math.round(netPay * 100) / 100,
    breakdown: {
      earnings: {
        basicSalary: input.basicSalary,
        housingAllowance: input.housingAllowance,
        transportAllowance: input.transportAllowance,
        otherTaxableAllowances: input.otherTaxableAllowances,
        nonTaxableAllowances: input.nonTaxableAllowances,
        overtimePay: input.overtimePay,
        bonus: input.bonus,
      },
      deductions: {
        paye: Math.round(paye * 100) / 100,
        nssfEmployee: nssf.employee,
        shaDeduction,
        housingLevyEmployee: housingLevy.employee,
        otherDeductions: input.otherDeductions,
      },
      employerContributions: {
        nssfEmployer: nssf.employer,
        housingLevyEmployer: housingLevy.employer,
      },
    },
  };
}

/**
 * Validate KRA PIN format (A followed by 9 digits and a letter)
 */
export function validateKRAPin(pin: string): boolean {
  const kraPattern = /^[AP]\d{9}[A-Z]$/;
  return kraPattern.test(pin.toUpperCase());
}

/**
 * Validate National ID format (7-8 digits)
 */
export function validateNationalID(id: string): boolean {
  const idPattern = /^\d{7,8}$/;
  return idPattern.test(id);
}

/**
 * Validate NSSF number format
 */
export function validateNSSFNumber(num: string): boolean {
  // NSSF numbers are typically 9-10 digits
  const nssfPattern = /^\d{9,10}$/;
  return nssfPattern.test(num);
}

/**
 * Format currency in Kenyan Shillings
 */
export function formatKES(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get month name from number
 */
export function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}
