export const HR_DEPARTMENTS=[
  {id:"d1",name:"Field Operations",lead:"emp3",color:"#B45309",count:12},
  {id:"d2",name:"Project Management",lead:"emp2",color:"#005CCC",count:6},
  {id:"d3",name:"Health & Safety",lead:"emp5",color:"#0B6B3A",count:3},
  {id:"d4",name:"Human Resources",lead:"emp7",color:"#5B2E8C",count:3},
  {id:"d5",name:"Finance & Admin",lead:"emp10",color:"#0F5C8C",count:3},
];

/* Per-company managed departments (the new source of truth going forward).
   HR_DEPARTMENTS above is kept for backward-compat lookup by id. */
export const HR_DEPARTMENTS_SEED=[
  {id:"d1",companyId:"e1",name:"Field Operations",lead:"emp3",color:"#B45309",about:"On-site trades, foremen, and crews executing construction work"},
  {id:"d2",companyId:"e1",name:"Project Management",lead:"emp2",color:"#005CCC",about:"Superintendents, planners, and coordinators running each project"},
  {id:"d3",companyId:"e1",name:"Health & Safety",lead:"emp5",color:"#0B6B3A",about:"WSIB, incident response, hazard assessments, safety training"},
  {id:"d4",companyId:"e1",name:"Human Resources",lead:"emp7",color:"#5B2E8C",about:"Talent, culture, payroll, benefits, employee relations"},
  {id:"d5",companyId:"e1",name:"Finance & Admin",lead:"emp10",color:"#0F5C8C",about:"Bookkeeping, invoicing, AR/AP, financial reporting"},
];
