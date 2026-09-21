export type Result = "correct" | "partial" | "wrong";
export type Attempt = { id:string; book_id:string|null; unit_id:string|null; problem_number:string|null; result:Result; duration_seconds:number; attempted_at:string; partial_mistake:string|null; memo:string|null };
export type DailyTask = { id:string; task_date:string; content:string; completed:boolean; created_at:string; target_count:number|null; actual_count:number|null; unit:string|null; goal_id:string|null };
export type Reflection = { id:string; reflection_date:string; content:string; created_at:string };
export type ReviewSchedule = { id:string; attempt_id:string|null; book_id:string; unit_id:string; problem_number:string; review_type:string; review_round:number; scheduled_date:string; completed:boolean; completed_at:string|null; stage:string; created_at:string };
export type Goal = { id:string; title:string; goal_type:string; target_value:number; unit:string; start_date:string; deadline:string; book_id:string|null; subject:string|null; created_at:string };
export type Exam = { id:string; name:string; exam_type:string; exam_date:string; scope:string|null; goal:string|null; memo:string|null; created_at:string };
export type ExamResult = { id:string; exam_id:string; subject:string; score:number|null; max_score:number|null; rank:number|null; deviation:number|null; judgment:string|null; memo:string|null; created_at:string };
export type ProblemNote = { id:string; book_id:string; unit_id:string; problem_number:string; content:string; updated_at:string };

export type SubjectMistake = { id:string; subject:string; content:string; created_at:string };
