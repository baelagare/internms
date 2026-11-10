import seedDatabase from '../../database.json';
import { changePlacement } from './placement.js';
import { submitTraining, reviewTraining } from './training.js';
import { recordAttendancePunchTransaction, submitAdjustmentTransaction } from './studentAttendance.js';
import { submitWeeklyTaskReportTransaction } from './studentTaskLogs.js';
import { submitEvaluation, certifyClearance } from './evaluations.js';
import { savePartnerRecord, createStaffRecord, saveSettingsRecord, createPolicyRecord } from './management.js';
import { decideAlert } from './governance.js';
import { createLocalRepository, updateProfile, changePortfolio, sendMessage, requireStudent } from './localRepository.js';
import { validateDocumentFile } from './studentChecklist.js';

const repository = () => createLocalRepository(seedDatabase, sessionStorage);
export const reviewAlert = async (actor, id, action, values) => repository().transact(db => decideAlert(db, actor, id, action, values));
export const savePartner = async (actor, id, values) => repository().transact(db => savePartnerRecord(db, actor, id, values));
export const createStaff = async (actor, values) => repository().transact(db => createStaffRecord(db, actor, values));
export const saveSettings = async (actor, college, values) => repository().transact(db => saveSettingsRecord(db, actor, college, values));
export const createPolicy = async (actor, values) => repository().transact(db => createPolicyRecord(db, actor, values));
export const saveEvaluation = async (actor, studentId, values) => repository().transact(db => submitEvaluation(db, actor, studentId, values));
export const grantClearance = async (actor, studentId) => repository().transact(db => certifyClearance(db, actor, studentId));
export const createTrainingSubmission = async (actor, kind, values) => repository().transact(db => submitTraining(db, actor, kind, values));
export const submitWeeklyTaskReport = async (actor, payload) => repository().transact(db => submitWeeklyTaskReportTransaction(db, actor, payload));
export const recordAttendancePunch = async (actor, payload) => repository().transact(db => recordAttendancePunchTransaction(db, actor, payload));
export const submitAttendanceAdjustment = async (actor, payload) => repository().transact(db => submitAdjustmentTransaction(db, actor, payload));
export const reviewSubmission = async (actor, kind, id, studentId, approve, remarks) => repository().transact(db => reviewTraining(db, actor, kind, id, studentId, approve, remarks));
export const savePlacement = async (actor, studentId, hteId, reason) => repository().transact(db => changePlacement(db, actor, studentId, hteId, reason));
export const readApplicationData = async () => repository().read();
export const saveApplicationData = async data => repository().write(data);
export const saveProfile = async (actor, values) => repository().transact(db => updateProfile(db, actor, values));
export const editPortfolio = async (actor, collection, action, value) => repository().transact(db => changePortfolio(db, actor, collection, action, value));
export const postMessage = async (actor, recipientId, text) => repository().transact(db => sendMessage(db, actor, recipientId, text));

export async function saveStudentFile(actor, target, file) {
  // The legacy implementation persists metadata, not document bytes. Preserve that contract explicitly.
  const fileError = validateDocumentFile(file);
  if (fileError) throw new Error(fileError);
  return repository().transact(db => {
    const student = requireStudent(db, actor);
    const metadata = { fileName: file.name, uploadedAt: new Date().toISOString(), fileSize: `${Math.round(file.size / 1024)} KB` };
    if (target === 'resume') student.portfolioData.resume = metadata;
    else {
      const document = student.preDeploymentDocs?.find(item => item.id === target);
      if (!document) throw new Error('This checklist requirement no longer exists.');
      Object.assign(document, metadata, { status: 'Pending Verification', verifiedBy: null, remarks: 'Submitted for coordinator verification.' });
    }
  });
}

export async function removeResume(actor) {
  return repository().transact(db => { requireStudent(db, actor).portfolioData.resume = null; });
}

export async function restorePortfolioItem(actor, collection, value, index) {
  return repository().transact(db => {
    const student = requireStudent(db, actor);
    if (collection === 'resume') student.portfolioData.resume = value;
    else {
      if (!['skills', 'coursework', 'achievements'].includes(collection)) throw new Error('Unknown portfolio collection.');
      (student.portfolioData[collection] ||= []).splice(index, 0, value);
    }
  });
}