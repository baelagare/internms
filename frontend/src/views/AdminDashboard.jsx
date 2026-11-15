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
          title="Administrator dashboard"
          subtitle="University-wide internship management and compliance oversight."
        />
        <Card>
          <EmptyState
            title="Administration data unavailable"
            description="System records are not connected yet. No cohort totals or policy counts are assumed."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <PageHeader
        title="Administrator dashboard"
        subtitle="University-wide internship management, partner governance, and academic compliance."
      />

      {collegeOptions.length > 0 && (
        <div className="max-w-xs">
          <Field
            label="Filter college scope"
            options={[{ value: 'ALL', label: 'All colleges' }, ...collegeOptions.map(code => ({ value: code, label: `${code}${NEMSU_COLLEGES[code]?.name ? ` · ${NEMSU_COLLEGES[code].name}` : ''}` }))]}
            value={college}
            onChange={event => setCollege(event.target.value)}
          />
        </div>
      )}

      <SummaryMetrics className="admin-kpi-grid" ariaLabel="System overview metrics" items={[
        { label: 'Interns in scope', value: model.internsCount, detail: `${model.deployedCount} deployed · ${model.pendingPlacementCount} pending endorsement` },
        { label: 'Host organizations', value: model.partnersCount, detail: model.hasCapacityData ? `${model.totalFilledSlots} / ${model.totalMaxSlots} slots occupied` : 'Slot capacity not recorded' },
        { label: 'Policy corpus', value: model.policyClausesCount != null ? model.policyClausesCount : '—', detail: model.policyClausesCount != null ? 'Institutional clauses' : 'Corpus unavailable' },
        { label: 'Audit records', value: model.auditEventsCount != null ? model.auditEventsCount : '—', detail: model.auditEventsCount != null ? 'Logged system events' : 'Audit logs unavailable' }
      ]} />

      <section aria-labelledby="admin-tools-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="admin-tools-heading" className="text-xl font-semibold text-ink">Administrative tools</h2>
            <p className="text-sm text-muted">Access institutional governance and configuration modules.</p>
          </div>
        </div>
        <div className="admin-quick-links">
          <Button onClick={() => onNavigate?.('alerts')}>Risk alerts</Button>
          <Button variant="secondary" onClick={() => onNavigate?.('placement')}>Placement review</Button>
          <Button variant="secondary" onClick={() => onNavigate?.('corpus')}>Policy corpus</Button>
          <Button variant="secondary" onClick={() => onNavigate?.('audit-logs')}>Audit trail</Button>
          <Button variant="secondary" onClick={() => onNavigate?.('partners')}>Partner companies</Button>
          <Button variant="secondary" onClick={() => onNavigate?.('staff')}>Staff accounts</Button>
          <Button variant="secondary" onClick={() => onNavigate?.('settings')}>College settings</Button>
        </div>
      </section>

      <section aria-labelledby="college-compliance-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="college-compliance-heading" className="text-xl font-semibold text-ink">College compliance summary</h2>
            <p className="text-sm text-muted">Academic progress and coordinator assignment per university college.</p>
          </div>
          <Button variant="quiet" onClick={() => onNavigate?.('interns')}>View intern directory</Button>
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
              title="No college settings provisioned"
              description="Configure colleges in College Settings to view academic compliance breakdowns."
              icon="building"
              action={
                <Button variant="secondary" onClick={() => onNavigate?.('settings')}>
                  Configure college settings
                </Button>
              }
            />
          </Card>
        )}
      </section>
    </div>
  );
}