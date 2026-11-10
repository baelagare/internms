import { scopedStudents, requireStudent } from './localRepository.js';
import { computeSbertPlacementRankings } from '../../src/services/sbertEngine.js';

export function recordLocalAudit(db, actor, student, actionType, summary, details = {}) {
  (db.auditLogs ||= []).unshift({ id: `AUD-${crypto.randomUUID()}`, timestamp: new Date().toISOString(), actorId: actor.id, actorName: actor.name, actorRole: actor.role, college: student.college, targetStudent: student.name, actionType, summary, persistence: 'local-session', ...details });
}

export function changePlacement(db, actor, studentId, hteId, reason = '') {
  const student = scopedStudents(db, actor).find(item => item.id === studentId);
  if (!student || !['student', 'coordinator', 'admin'].includes(actor.role)) throw new Error('This placement is outside your authorized scope.');
  const ranking = computeSbertPlacementRankings(student, db.htes, db.collegeSettings);
  const match = ranking.find(item => item.hteId === hteId);
  if (!match) throw new Error('Select a recommended partner.');
  const partner = db.htes.find(item => item.id === hteId);
  if (actor.role === 'student') {
    requireStudent(db, actor);
    if (!match.eligibility.hardEligible) throw new Error('This partner does not meet the placement eligibility requirements.');
    // The local workflow stores one preference, not multiple applications. Re-read
    // and reject duplicate active requests here as well as disabling their UI.
    if (student.preferredHte === partner.name && (student.placementStatus === 'Pending Coordinator Endorsement' || (student.placementStatus === 'Approved & Deployed' && student.company !== partner.name))) {
      throw new Error('This placement preference is already saved for coordinator review.');
    }
    student.preferredHte = partner.name;
    student.preferredRole = partner.roleTitle;
    if (student.placementStatus !== 'Approved & Deployed') {
      student.placementStatus = 'Pending Coordinator Endorsement';
      student.company = 'Unassigned (Pending Coordinator Approval)';
    }
    recordLocalAudit(db, actor, student, 'STUDENT_PLACEMENT_PREFERENCE_SUBMITTED', `Requested Rank #${match.rank}: ${partner.name}`, { ruleOrModelRef: 'Legacy local similarity ranking', originalDraft: match.reasoning, finalDispatchedText: `Awaiting coordinator approval for ${partner.name}` });
    return;
  }
  const override = match.rank !== 1 && student.preferredHte !== partner.name;
  if (override && reason.trim().length < 5) throw new Error('Provide at least five characters explaining the ranking override.');
  const sameAssignment = student.company === partner.name && student.placementStatus === 'Approved & Deployed';
  if (!sameAssignment && Number(partner.filledSlots || 0) >= Number(partner.maxSlots || 5)) throw new Error('This partner has no available slots.');
  if (!sameAssignment) {
    const previous = db.htes.find(item => item.name === student.company);
    if (previous && student.placementStatus === 'Approved & Deployed') previous.filledSlots = Math.max(0, Number(previous.filledSlots || 0) - 1);
    partner.filledSlots = Number(partner.filledSlots || 0) + 1;
  }
  student.company = partner.name;
  student.assignedRole = partner.roleTitle;
  student.placementStatus = 'Approved & Deployed';
  student.deploymentStartDate ||= new Date().toISOString().slice(0, 10);
  recordLocalAudit(db, actor, student, override ? 'PLACEMENT_HITL_OVERRIDE' : 'PLACEMENT_HITL_ENDORSEMENT', `Assigned Rank #${match.rank}: ${partner.name}`, { originalDraft: `Top Match: ${ranking[0]?.company}`, finalDispatchedText: `Approved deployment to ${partner.name} (${partner.roleTitle})`, overrideReason: override ? reason.trim() : null, ruleOrModelRef: 'Legacy local similarity ranking' });
}