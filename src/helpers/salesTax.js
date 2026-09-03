/* Combined GST/HST (+ QST where applicable) by province — public, stable rates. Shared between
   staffing invoicing and HR invoicing, which each independently need a real per-jurisdiction
   sales tax rate instead of a single hardcoded percentage. */
export const SALES_TAX_RATE = {
  ON:0.13, NB:0.15, NL:0.15, NS:0.14, PE:0.15, /* HST provinces */
  QC:0.14975, /* GST 5% + QST 9.975% */
  AB:0.05, BC:0.05, MB:0.05, SK:0.05, NT:0.05, NU:0.05, YT:0.05, /* GST only */
};
export function salesTaxRate(prov){return SALES_TAX_RATE[prov]??0.05;}
export function salesTaxLabel(prov){
  const r=salesTaxRate(prov);
  const name=["ON","NB","NL","NS","PE"].includes(prov)?"HST":prov==="QC"?"GST+QST":"GST";
  return `${name} (${Math.round(r*10000)/100}%)`;
}
