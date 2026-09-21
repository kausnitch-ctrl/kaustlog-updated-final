export type ReviewStage = "day1"|"day7"|"day14"|"day30"|"extra30"|"day90";
export function addDays(date:string, days:number){const d=new Date(`${date}T00:00:00+09:00`); d.setDate(d.getDate()+days); return d.toLocaleDateString("en-CA",{timeZone:"Asia/Tokyo"});}
export function nextStage(stage:ReviewStage):ReviewStage|null { if(stage==="day1") return "day7"; if(stage==="day7") return "day14"; if(stage==="day14") return "day30"; return null; }
export function nextReviewDate(from:string, stage:ReviewStage){ const days = stage==="day1"?1:stage==="day7"?7:stage==="day14"?14:stage==="day30"?30:stage==="extra30"?30:90; return addDays(from,days); }
