import { EXTRA_APPS } from "./applicationsExtra.js";

const FLAGSHIP_APPS=[
 {id:"a1",job:"j1",user:"u2",stage:"Interview",at:"2 days ago",note:"Site interview booked for Thursday 9am",avail:"Within 2 weeks",expect:"",letter:""},
 {id:"a2",job:"j1",user:"u6",stage:"Reviewed",at:"3 days ago",note:"Employer opened your profile",avail:"Immediately",expect:"",letter:""},
 {id:"a3",job:"j1",user:"u8",stage:"Applied",at:"1 day ago",note:"Waiting for employer review",avail:"Immediately",expect:"",letter:""},
 {id:"a4",job:"j2",user:"u3",stage:"Shortlisted",at:"4 days ago",note:"Shortlisted for a panel interview",avail:"Within 1 month",expect:"",letter:""},
 {id:"a5",job:"j3",user:"u4",stage:"Offer",at:"1 week ago",note:"Offer letter sent, awaiting your response",avail:"Within 2 weeks",expect:"",letter:""},
 {id:"a6",job:"j14",user:"u1",stage:"Reviewed",at:"2 days ago",note:"Employer opened your profile",avail:"Within 1 month",expect:"",letter:""},
 {id:"a7",job:"j5",user:"u7",stage:"Applied",at:"1 day ago",note:"Waiting for employer review",avail:"Immediately",expect:"",letter:""},
 {id:"a8",job:"j9",user:"u8",stage:"Shortlisted",at:"5 days ago",note:"Invited to a hiring session",avail:"Immediately",expect:"",letter:""},
 {id:"a9",job:"j23",user:"u6",stage:"Applied",at:"2 days ago",note:"Waiting for employer review",avail:"Within 2 weeks",expect:"",letter:""},
 {id:"a10",job:"j11",user:"u2",stage:"Applied",at:"6 days ago",note:"Waiting for employer review",avail:"Within 1 month",expect:"",letter:""},
];

export const SEED_APPS=[...FLAGSHIP_APPS, ...EXTRA_APPS];
