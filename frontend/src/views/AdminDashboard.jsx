import { useState } from 'react';
import { Button, Card, EmptyState, Notice, PageHeader, SummaryMetrics } from '../components/ui.jsx';
import { Field } from '../components/workflow.jsx';
import { adminDashboardModel } from '../services/adminDashboard.js';
import { NEMSU_COLLEGES, collegeCodesForWorkspace } from '../config/institution.js';
import './adminDashboard.css';

export function AdminDashboard({ user, db = {}, onNavigate }) {
  const [college, setCollege] = useState('ALL');
  const model = adminDashboardModel(db, user, college);
  const collegeOptions = collegeCodesForWorkspace(db);

  if (!model.available) {
    return (
      <div className="admin-dashboard">
        <PageHeader
          title="Administrator Dashboard"
          subtitle="University-wide internship management and compliance oversight."
        />
        <Card>
          <EmptyState
            title="Administration Data Unavailable"
            description="System records are not connected yet. No cohort totals or policy counts are assumed."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <PageHeader
        title="Administrator Dashboard"
        subtitle="University-wide internship management, partner governance, and academic compliance."
      />

      {collegeOptions.length > 0 && (
        <div className="max-w-xs">
          <Field
            label="Filter College Scope"
            options={[{ value: 'ALL', label: 'All colleges' }, ...collegeOptions.map(code => ({ value: code, label: `${code}${NEMSU_COLLEGES[code]?.name ? ` · ${NEMSU_COLLEGES[code].name}` : ''}` }))]}
            value={college}
            onChange={event => setCollege(event.target.value)}
          />
        </div>
      )}

      <SummaryMetrics className="admin-kpi-grid" ariaLabel="System overview metrics" items={[
        { label: 'Interns in Scope', value: model.internsCount, detail: `${model.deployedCount} deployed · ${model.pendingPlacementCount} pending endorsement` },
        { label: 'Host Organizations', value: model.partnersCount, detail: model.hasCapacityData ? `${model.totalFilledSlots} / ${model.totalMaxSlots} slots occupied` : 'Slot capacity not recorded' },
        { label: 'Policy Corpus', value: model.policyClausesCount != null ? model.policyClausesCount : '—', detail: model.policyClausesCount != null ? 'Institutional clauses' : 'Corpus unavailable' },
        { label: 'Audit Records', value: model.auditEventsCount != null ? model.auditEventsCount : '—', detail: model.auditEventsCount != null ? 'Logged system events' : 'Audit logs unavailable' }
      ]} />

      <section aria-labelledby="admin-tools-heading">
        <div className="admin-section-heading">
          <div>
            <h2 id="admin-tools-heading">Administrative Tools</h2>
            <p>Access institutional governance and configuration modules.</p>
          </div>
        </div>
        <div className="admin-quick-links">
          <Button onClick={() => onNavigate?.('alerts')}>Risk Alerts</Button>
          <Button variant="secondary" onClick={() => onNavigate?.('placement')}>Placement Review</Button>
          <Button variant="secondary" onClick={() => onNavigate?.('corpus')}>Policy Corpus</Button>
          <Button variant="secondary" onClick={() => onNavigate?.('audit-logs')}>Audit Trail</Button>
          <Button variant="secondary" onClick={() => onNavigate?.('partners')}>Partner Companies</Button>
          <Button variant="secondary" onClick={() => onNavigate?.('staff')}>Staff Accounts</Button>
          <Button variant="secondary" onClick={() => onNavigate?.('settings')}>College Settings</Button>
        </div>
      </section>

      <section aria-labelledby="college-compliance-heading">
        <div className="admin-section-heading">
          <div>
            <h2 id="college-compliance-heading">College Compliance Summary</h2>
            <p>Academic progress and coordinator assignment per university college.</p>
          </div>
          <Button variant="quiet" onClick={() => onNavigate?.('interns')}>View Intern Directory</Button>
        </div>

        {model.collegeBreakdown.length > 0 ? (
          <div className="admin-table-region" role="region" aria-label="College compliance records" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th scope="col">College</th>
                  <th scope="col">OJT Coordinator</th>
                  <th scope="col">Required Quota</th>
                  <th scope="col">Total Interns</th>
                  <th scope="col">Placed &amp; Deployed</th>
                  <th scope="col">Pending Endorsement</th>
                </tr>
              </thead>
              <tbody>
                {model.collegeBreakdown.map(col => (
                  <tr key={col.code}>
                    <th scope="row">
                      <div>
                        <span className="font-semibold text-ink">{col.code}</span>
                        {NEMSU_COLLEGES[col.code]?.name && (
                          <p className="text-xs font-normal text-muted">{NEMSU_COLLEGES[col.code].name}</p>
                        )}
                      </div>
                    </th>
                    <td>{col.coordinatorName}</td>
                    <td>{col.quota}</td>
                    <td className="tabular-nums">{col.totalInterns}</td>
                    <td className="tabular-nums">{col.deployedCount}</td>
                    <td className="tabular-nums">{col.pendingCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Card>
            <EmptyState
              title="No College Settings Provisioned"
              description="Configure colleges in College Settings to view academic compliance breakdowns."
              icon="building"
              action={
                <Button variant="secondary" onClick={() => onNavigate?.('settings')}>
                  Configure College Settings
                </Button>
              }
            />
          </Card>
        )}
      </section>
    </div>
  );
}