import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWorkspace } from '../src/services/workspaceAdapter.js';
import { getApiBaseUrl } from '../src/services/apiClient.js';

test('workspace adapter maps API workflow records to frontend-compatible records without inventing values', () => {
  const data = normalizeWorkspace({
    academicYear: 'A.Y. 2026–2027',
    campus: 'NEMSU Main Campus',
    users: [{ id: 10, role: 'student', studentProfileId: 42, preDeploymentDocs: [{ id: 1, docCode: 'MOA' }] }],
    htes: [],
    collegeSettings: {},
    logs: [{ id: 7, type: 'weekly_report', week: 2, status: 'Submitted', summary: 'Work completed' }],
    dtrDisputes: [],
    alerts: [], evaluations: [], auditLogs: [], messages: [], policyCorpus: []
  });

  assert.equal(data.connected, true);
  assert.equal(data.users[0].studentProfileId, 42);
  assert.equal(data.users[0].preDeploymentDocs[0].code, 'MOA');
  assert.equal(data.logs[0].kind, 'weekly_task');
  assert.equal(data.logs[0].status, 'Pending Supervisor Verification');
  assert.equal(data.logs[0].description, 'Work completed');
});

test('API base URL uses the configured Vite value when present or the local Laravel default', () => {
  assert.match(getApiBaseUrl(), /api\/v1$/);
});
