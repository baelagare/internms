import { scopedStudents } from './localRepository.js';
import { recordLocalAudit } from './placement.js';
export function decideAlert(db, actor, id, action, values) {
  if (!['admin', 'coordinator'].includes(actor.role)) throw new Error('Coordinator authorization required.');
  const alert = db.alerts.find(item => item.id === id);
  if (!alert || (actor.role === 'coordinator' && alert.college !== actor.college)) throw new Error('Alert is outside your authorized scope.');
  const student = scopedStudents(db, actor).find(item => item.id === alert.studentId || item.name === alert.student);
  if (!student) throw new Error('The alert student is unavailable in your scope.');
  const originalDraft = alert.draftMessage || values.originalDraft || '';
  if (action === 'dismiss') {
    if ((values.reason || '').trim().length < 5) throw new Error('Enter at least five characters explaining the dismissal.');
    alert.hitlStatus = 'Dismissed / Overridden (False Positive)';
    alert.status = 'Dismissed / Overridden';
    recordLocalAudit(db, actor, student, 'EARLY_WARNING_DISMISSED_OVERRIDE', `Dismissed ${alert.ruleLabel} with justification.`, { originalDraft, finalDispatchedText: 'Alert dismissed (no message sent).', overrideReason: values.reason.trim(), ruleOrModelRef: `${alert.ruleCode} · ${(alert.retrievedClauseIds || []).join(', ')}` });
    return;
  }
  if (!['approve', 'edit'].includes(action) || !values.message?.trim()) throw new Error('Enter an advisory before dispatching.');
  if (!['warning_1', 'warning_2', 'case_conference', 'remedial_plan'].includes(values.stage)) throw new Error('Choose an intervention stage.');
  alert.draftMessage = values.message.trim();
  alert.warningStage = values.stage;
  alert.hitlStatus = action === 'edit' ? 'Edited & Dispatched by Coordinator' : 'Approved & Dispatched by Coordinator';
  alert.status = alert.hitlStatus;
  db.messages.push({ id: crypto.randomUUID(), senderId: actor.id, senderName: actor.name, senderRole: actor.role, recipientId: student.id, text: alert.draftMessage, time: new Date().toLocaleString() });
  recordLocalAudit(db, actor, student, action === 'edit' ? 'EARLY_WARNING_EDITED_AND_DISPATCHED' : 'EARLY_WARNING_APPROVED_AND_DISPATCHED', `Dispatched ${alert.ruleLabel} advisory locally.`, { originalDraft, finalDispatchedText: alert.draftMessage, ruleOrModelRef: `${alert.ruleCode} · ${(alert.retrievedClauseIds || []).join(', ')}`, overrideReason: action === 'edit' ? 'Coordinator customized advisory message before sending.' : null });
}