/* Every employee belongs to one company (`companyId`) and has a `visibility`
   object controlling their public NorthHire profile. Role definitions
   (HR_ROLES) live in hrCompanySettings.js. */
export const HR_EMPLOYEE=(id,companyId,name,email,role,dept,title,hired,seed,phone,city,prov,salary,birthDate,manager,skills,badges,vis)=>
  ({id,companyId,name,email,role,dept,title,hired,seed,phone,city,prov,salary,birthDate,manager,skills,badges,
    status:"active", /* active | on-leave | terminated */
    visibility:vis||{title:true,department:true,tenure:true,badges:true,trainings:true,salary:false,phone:false,birthDate:false,manager:true,email:false},
    linkedNorthHireUserId:null, /* set at hydration if a matching seeker exists */
    joinedDate:hired,pin:"1234", /* punch-in PIN */
  });

export const HR_EMPLOYEES=[
  /* PCL Construction — company e1 */
  HR_EMPLOYEE("emp1","e1","Rachel Martel","rachel.martel@pcl.com","owner","d2","Chief Operating Officer","2011-04-01",4,"403 555 0101","Calgary","AB",245000,"1978-06-15",null,["Program Management","P.Eng.","Site Leadership","P3 Delivery"],["Founder's Circle","10 Years","Safety Leader"]),
  HR_EMPLOYEE("emp2","e1","Marcus Bediako","marcus.b@pcl.com","admin","d2","VP, Operations","2015-09-14",3,"403 555 0102","Calgary","AB",185000,"1982-03-22","emp1",["Red Seal","Project Management","Client Relations","LEED AP"],["Rising Star","5 Years","Safety Champion"]),
  HR_EMPLOYEE("emp3","e1","Priya Raman","priya.r@pcl.com","admin","d1","Director, Field Operations","2016-06-01",2,"403 555 0103","Calgary","AB",172000,"1984-11-08","emp1",["Site Superintendent","Gold Seal","Union Relations","Cost Control"],["Field Excellence","5 Years"]),
  HR_EMPLOYEE("emp4","e1","Jomar Villanueva","jomar.v@pcl.com","employee","d1","Senior Site Superintendent","2017-03-20",5,"403 555 0104","Edmonton","AB",128000,"1980-01-30","emp3",["Site Management","Gold Seal","Trades Coordination","Concrete Placement"],["Safety Champion","3 Years"]),
  HR_EMPLOYEE("emp5","e1","Amelie Fortin","amelie.f@pcl.com","admin","d3","Director, Health & Safety","2018-08-15",1,"403 555 0105","Calgary","AB",156000,"1985-09-12","emp1",["OHS Certification","Incident Investigation","WHMIS Master","Auditing"],["Safety Champion","5 Years","Zero Incidents"]),
  HR_EMPLOYEE("emp6","e1","Daniel Kovacs","daniel.k@pcl.com","employee","d1","Journeyperson Electrician","2019-05-06",6,"403 555 0106","Calgary","AB",96000,"1988-07-18","emp3",["Red Seal","Commercial Wiring","Blueprint Reading","CSA Code"],["Apprentice Mentor","3 Years"]),
  HR_EMPLOYEE("emp7","e1","Linda Osei","linda.o@pcl.com","hr","d4","Director, People & Culture","2019-11-04",8,"403 555 0107","Calgary","AB",148000,"1981-04-25","emp1",["HRM Certification","Employment Law","DEI Strategy","Coaching"],["People Leader","3 Years"]),
  HR_EMPLOYEE("emp8","e1","Omar Haddad","omar.h@pcl.com","employee","d2","Project Manager, Infrastructure","2020-01-13",9,"403 555 0108","Edmonton","AB",135000,"1987-12-03","emp2",["Project Management","P.Eng.","Contract Admin","Schedule"],["Rising Star","3 Years"]),
  HR_EMPLOYEE("emp9","e1","Sofia Reyes","sofia.r@pcl.com","hr","d4","HR Business Partner","2020-07-22",11,"403 555 0109","Calgary","AB",95000,"1990-02-14","emp7",["HRBP","Talent Management","Onboarding","Recruiting"],["Onboarding Champion"]),
  HR_EMPLOYEE("emp10","e1","Isaac Chen","isaac.c@pcl.com","finance","d5","Director, Finance","2018-11-01",7,"403 555 0110","Calgary","AB",162000,"1979-08-11","emp1",["CPA","Financial Reporting","Audit","Treasury"],["Numbers Wizard","5 Years"]),
  HR_EMPLOYEE("emp11","e1","Nadia Farooq","nadia.f@pcl.com","finance","d5","Payroll Manager","2021-02-08",10,"403 555 0111","Calgary","AB",88000,"1986-05-20","emp10",["Payroll","CPA","T4","Benefits Admin"],["Detail Master"]),
  HR_EMPLOYEE("emp12","e1","Ben Adekunle","ben.a@pcl.com","employee","d1","Welder, Journeyperson","2021-06-15",5,"403 555 0112","Fort McMurray","AB",112000,"1989-03-08","emp3",["CWB Certified","MIG","TIG","Structural Steel"],["Precision Award"]),
  HR_EMPLOYEE("emp13","e1","Grace Lee","grace.l@pcl.com","employee","d2","Project Coordinator","2022-01-10",2,"403 555 0113","Calgary","AB",72000,"1994-06-30","emp2",["Coordination","Procore","Document Control","Scheduling"],["Fast Track"]),
  HR_EMPLOYEE("emp14","e1","Andre Toussaint","andre.t@pcl.com","employee","d1","Heavy Equipment Operator","2022-04-18",4,"403 555 0114","Edmonton","AB",89000,"1983-10-12","emp3",["Crane Operator","Excavator","Grader","Rigging"],["Precision Award"]),
  HR_EMPLOYEE("emp15","e1","Kim Nguyen","kim.n@pcl.com","employee","d1","Ironworker","2022-08-01",8,"403 555 0115","Calgary","AB",96000,"1991-01-19","emp3",["Structural Steel","Rigging","Rebar","Reinforcing"],["Rising Star"]),
  HR_EMPLOYEE("emp16","e1","Julia Kaminski","julia.k@pcl.com","employee","d3","Safety Officer","2022-11-14",11,"403 555 0116","Calgary","AB",78000,"1993-08-04","emp5",["OHS Officer","Incident Investigation","First Aid","WHMIS"],["Zero Incidents"]),
  HR_EMPLOYEE("emp17","e1","Rashid Patel","rashid.p@pcl.com","employee","d2","BIM Coordinator","2023-01-16",3,"403 555 0117","Calgary","AB",82000,"1992-11-22","emp2",["Revit","AutoCAD","Navisworks","Clash Detection"],["Digital Champion"]),
  HR_EMPLOYEE("emp18","e1","Maddie O'Brien","maddie.o@pcl.com","employee","d1","Apprentice Electrician (3rd year)","2023-03-06",1,"403 555 0118","Calgary","AB",64000,"2001-04-11","emp6",["Apprentice","Blueprint Reading","Hand Tools","WHMIS"],["Apprentice"]),
  HR_EMPLOYEE("emp19","e1","Tyrell Simmons","tyrell.s@pcl.com","employee","d1","Carpenter","2023-05-22",6,"403 555 0119","Edmonton","AB",84000,"1990-07-25","emp3",["Formwork","Framing","Finish Carpentry","Red Seal"],["Craftsman"]),
  HR_EMPLOYEE("emp20","e1","Rita Voskoboynikov","rita.v@pcl.com","employee","d2","Estimator","2023-07-11",9,"403 555 0120","Calgary","AB",92000,"1988-09-14","emp2",["Estimating","Bluebeam","Take-offs","Bid Strategy"],["Numbers Wizard"]),
  HR_EMPLOYEE("emp21","e1","Chike Okoro","chike.o@pcl.com","employee","d1","Millwright","2023-09-25",5,"403 555 0121","Fort McMurray","AB",108000,"1987-02-28","emp3",["Millwright","Rigging","Alignment","Preventive Maintenance"],["Precision Award"]),
  HR_EMPLOYEE("emp22","e1","Sarah Mackenzie","sarah.m@pcl.com","employee","d3","Junior Safety Officer","2024-01-08",8,"403 555 0122","Calgary","AB",64000,"1998-11-30","emp5",["First Aid","WHMIS","Working at Heights","Safety Auditing"],["New Grad"]),
  HR_EMPLOYEE("emp23","e1","Fabian Ostrowski","fabian.o@pcl.com","employee","d2","Cost Analyst","2024-02-19",7,"403 555 0123","Calgary","AB",78000,"1996-06-09","emp10",["Cost Control","Excel","Power BI","Reporting"],["Fast Track"]),
  HR_EMPLOYEE("emp24","e1","Talia Yeboah","talia.y@pcl.com","employee","d4","People Ops Coordinator","2024-04-01",2,"403 555 0124","Calgary","AB",62000,"1997-12-15","emp7",["HR Support","Onboarding","Culture","Events"],["New Grad"]),
  HR_EMPLOYEE("emp25","e1","Vikram Sethi","vikram.s@pcl.com","employee","d5","Accounts Payable Specialist","2024-05-13",3,"403 555 0125","Calgary","AB",58000,"1994-08-27","emp10",["A/P","QuickBooks","Reconciliation","Vendor Management"],["Detail Master"]),
  HR_EMPLOYEE("emp26","e1","Emma Roussel","emma.r@pcl.com","employee","d1","Concrete Finisher","2024-07-08",11,"403 555 0126","Edmonton","AB",82000,"1993-05-04","emp3",["Concrete Finishing","Forms","Curing","Placing"],["Craftsman"]),
  HR_EMPLOYEE("emp27","e1","Solomon Habte","solomon.h@pcl.com","employee","d1","Sheet Metal Worker","2024-09-15",6,"403 555 0127","Calgary","AB",89000,"1991-10-18","emp3",["Sheet Metal","HVAC Ducting","Fabrication","Layout"],["Rising Star"]),
  HR_EMPLOYEE("emp28","e1","Chloé Bouchard","chloe.b@pcl.com","employee","d2","Contracts Administrator","2024-11-04",4,"403 555 0128","Montreal","QC",76000,"1989-04-02","emp2",["CCDC Contracts","Legal Review","Change Orders","Bilingual"],["Detail Master"]),
  HR_EMPLOYEE("emp29","e1","Priyanka Sharma","priyanka.s@pcl.com","employee","d3","Environmental Coordinator","2025-01-20",1,"403 555 0129","Calgary","AB",72000,"1995-07-11","emp5",["Environmental Compliance","Waste Management","Reporting","Auditing"],["New Grad"]),
  HR_EMPLOYEE("emp30","e1","Oscar Reyna","oscar.r@pcl.com","employee","d1","Plumber (Journeyperson)","2025-03-10",8,"403 555 0130","Edmonton","AB",92000,"1990-12-05","emp3",["Red Seal Plumbing","Backflow Prevention","Piping","Fixtures"],["Craftsman"]),
];
