import { scopedStudents } from './localRepository.js';
import { recordLocalAudit } from './placement.js';
export const rubric = [
  ['Technical competence & quality of work', ['Mastery of fundamental tools, technologies, and methods required by the role', 'Accuracy, thoroughness, and reliability of completed technical deliverables', 'Problem-solving ability and analytical troubleshooting under supervision', 'Adherence to industry quality standards, documentation, and safety protocols', 'Productivity and ability to meet sprint or departmental deadlines']],
  ['Work habits, punctuality & attendance', ['Regularity of daily attendance and adherence to the shift schedule', 'Punctuality in reporting to the workstation and returning from breaks', 'Responsible stewardship of company equipment, data privacy, and resources', 'Orderliness, discipline, and compliance with company rules', 'Consistency in logging daily and weekly accomplishment reports accurately']],
  ['Communication, teamwork & professional ethics', ['Clarity and professionalism in written and verbal communication', 'Receptiveness to constructive feedback and supervisor mentoring', 'Cooperation and collaboration with team members and staff', 'Courtesy, respect, and ethical conduct toward clients and colleagues', 'Composure and professionalism when handling workplace pressure']],
  ['Initiative, adaptability & overall readiness', ['Resourcefulness and proactive initiative in seeking meaningful tasks', 'Speed of learning new domain workflows and software systems', 'Alignment of demonstrated skills with degree program outcomes', 'Overall industry readiness for entry-level employment']]
];
export function scoreEvaluation(scores) {
  const values = Array.from({ length: 19 }, (_, index) => Number(scores[`q${index + 1}`]));
  if (values.some(value => !Number.isInteger(value) || value < 1 || value > 5)) throw new Error('Rate all 19 criteria from 1 to 5.');
  const totalScore = values.reduce((sum, value) => sum + value, 0), averageRating = Number((totalScore / 19).toFixed(2));
  const label = averageRating >= 4.5 ? 'Outstanding' : averageRating >= 3.5 ? 'Very Satisfactory' : averageRating >= 2.5 ? 'Satisfactory' : 'Needs Improvement';
  return { totalScore, maxScore: 95, averageRating, equivalentRating: `${label} (${Math.round(totalScore / 95 * 1000) / 10}%)`, recommendation: averageRating >= 3 ? 'Passed · Recommended for Final OJT Completion Clearance' : 'For Improvement · Remedial Coaching Recommended' };
}
export function submitEvaluation(db, actor, studentId, values) {
  if (actor.role !== 'supervisor') throw new Error('Only the assigned host supervisor can submit an evaluation.');
  const student = scopedStudents(db, actor).find(item => item.id === studentId);
  if (!student) throw new Error('This intern is outside your company scope.');
  for (const key of ['evaluationPeriod', 'strengths', 'areasForImprovement']) if (!values[key]?.trim()) throw new Error('Complete the period, strengths, and improvement feedback.');
  const calculated = scoreEvaluation(values.scores);
  const index = db.evaluations.findIndex(item => item.studentId === student.id && item.company === actor.company);
  const existing = db.evaluations[index];
  const record = { id: existing?.id || `EVAL-${crypto.randomUUID()}`, studentId, studentName: student.name, studentNumber: student.studentNumber || student.id, college: student.college, program: student.program, company: actor.company, supervisorId: actor.id, supervisorName: actor.name, supervisorTitle: actor.title || 'HTE Supervisor', evaluationPeriod: values.evaluationPeriod.trim(), strengths: values.strengths.trim(), areasForImprovement: values.areasForImprovement.trim(), scores: Object.fromEntries(Array.from({ length: 19 }, (_, i) => [`q${i + 1}`, Number(values.scores[`q${i + 1}`])])), ...calculated, submittedAt: new Date().toISOString(), coordinatorClearanceStatus: existing?.coordinatorClearanceStatus || 'Pending Coordinator Final Clearance' };
  if (index >= 0) db.evaluations[index] = record; else db.evaluations.unshift(record);
  recordLocalAudit(db, actor, student, 'HTE_EVALUATION_SUBMITTED', `Submitted 19-item evaluation: ${record.totalScore}/95`, { ruleOrModelRef: '19-Item Performance Evaluation Rubric', finalDispatchedText: record.recommendation });
}
export function certifyClearance(db, actor, studentId) {
  if (!['admin', 'coordinator'].includes(actor.role)) throw new Error('Coordinator authorization is required.');
  const student = scopedStudents(db, actor).find(item => item.id === studentId);
  if (!student) throw new Error('This intern is outside your scope.');
  const evaluation = db.evaluations.find(item => item.studentId === student.id || item.studentName === student.name);
  if (!evaluation) throw new Error('An evaluation is required for certification.');
  student.clearanceStatus = 'Cleared & Certified';
  evaluation.coordinatorClearanceStatus = 'Cleared & Certified';
  evaluation.coordinatorClearedBy = actor.name;
  recordLocalAudit(db, actor, student, 'FINAL_OJT_CLEARANCE_CERTIFIED', `Certified final OJT clearance for ${student.name}.`, { finalDispatchedText: 'Cleared & Certified', ruleOrModelRef: 'Final Completion Clearance' });
}