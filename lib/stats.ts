import type { Attempt } from "../types/database";
export function distinctProblemCount(attempts:Attempt[]){return new Set(attempts.map(a=>`${a.book_id}|${a.unit_id}|${a.problem_number}`)).size}
export function accuracy(attempts:Attempt[]){return attempts.length?Math.round(attempts.filter(a=>a.result==="correct").length/attempts.length*100):0}
export function seconds(attempts:Attempt[]){return attempts.reduce((s,a)=>s+Number(a.duration_seconds||0),0)}
export function latestByProblem(attempts:Attempt[]){const m=new Map<string,Attempt>(); [...attempts].sort((a,b)=>a.attempted_at.localeCompare(b.attempted_at)).forEach(a=>m.set(`${a.book_id}|${a.unit_id}|${a.problem_number}`,a)); return m}
