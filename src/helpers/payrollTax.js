/* Flat-rate CPP/EI/federal+provincial-tax approximation, shared by HR payroll, staffing
   payroll, and the seeker worker payslip breakdown so every domain shows the same math
   instead of three independently hardcoded percentages. Not a real bracket/TD1-aware
   calculation - flagged in project memory as a pending business decision on how precise
   this needs to get; this only removes the duplication, it doesn't change the realism. */
export const PAYROLL_TAX_RATES = { cpp: 0.0595, ei: 0.0221, fedTax: 0.145, provTax: 0.075 };

export function calcNetPay(gross) {
  const cpp = Math.round(gross * PAYROLL_TAX_RATES.cpp);
  const ei = Math.round(gross * PAYROLL_TAX_RATES.ei);
  const fedTax = Math.round(gross * PAYROLL_TAX_RATES.fedTax);
  const provTax = Math.round(gross * PAYROLL_TAX_RATES.provTax);
  const net = gross - (cpp + ei + fedTax + provTax);
  return { cpp, ei, fedTax, provTax, net };
}
