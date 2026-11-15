import { Button, Card, EmptyState, Notice, PageHeader, StatusBadge, SummaryMetrics } from '../components/ui.jsx';
import { coordinatorDashboardModel } from '../services/coordinatorDashboard.js';
import './coordinatorDashboard.css';

export function CoordinatorDashboard({ user, db, onNavigate }) {
  const model = coordinatorDashboardModel(db, user);
  if (!model.available) return <div className="coordinator-dashboard"><PageHeader title="Coordinator dashboard" subtitle="Review work for your college." /><Card><EmptyState title="Dashboard data unavailable" description="Coordinator records are not connected yet. No cohort totals or review counts are assumed." /></Card></div>;

  const firstTasks = model.pendingItems.slice(0, 5);
  return <div className="coordinator-dashboard">
    <PageHeader title="Coordinator dashboard" subtitle={`OJT activity for ${model.college}.`} />
    <SummaryMetrics className="coordinator-metrics" ariaLabel="Cohort overview" items={[
      { label: 'Interns in scope', value: model.studentsCount },
      { label: 'Needs review', value: model.pendingCount, detail: `${model.pendingWeeklyReports} weekly reports · ${model.pendingAttendanceAdjustments} attendance requests` },
      { label: 'Placement preferences', value: model.pendingPlacements, detail: 'Awaiting coordinator endorsement' },
      { label: 'Active risk alerts', value: model.activeAlertsCount }
    ]} />

    <section aria-labelledby="coordinator-actions-heading">
      <div className="coordinator-section-heading"><div><h2 id="coordinator-actions-heading">Review queue</h2><p>Items awaiting your review.</p></div>
        <Button variant="secondary" onClick={() => onNavigate?.('approvals')}>Open approvals</Button>
      </div>
      {firstTasks.length ? <ul className="coordinator-queue">
        {firstTasks.map((item, index) => <li key={item.id ?? `${item.type}-${index}`}><Card className="coordinator-queue-item">
          <div className="coordinator-queue-copy"><StatusBadge tone="warning">{item.type}</StatusBadge><h3>{item.label}</h3><p>{item.studentName}</p></div>
          <Button variant="secondary" onClick={() => onNavigate?.(item.route)}>Review</Button>
        </Card></li>)}
      </ul> : <Card><EmptyState title="No pending reviews" description="There are no review items in the available records." icon="clipboard" /></Card>}
    </section>

    {!model.checklistsAvailable && <Notice tone="info" title="Checklist totals unavailable">Document requirements have not been assigned in the available records.</Notice>}
    <section aria-labelledby="coordinator-cohort-heading">
      <div className="coordinator-section-heading"><div><h2 id="coordinator-cohort-heading">Cohort overview</h2><p>Students scoped to your college.</p></div>
        <Button variant="secondary" onClick={() => onNavigate?.('interns')}>View interns</Button>
      </div>
      {model.students.length ? <div className="coordinator-cohort" role="region" aria-label="Cohort records" tabIndex={0}>
        <table><thead><tr><th scope="col">Student</th><th scope="col">Program</th><th scope="col">Host company</th><th scope="col">Placement</th><th scope="col">Checklist</th><th scope="col">Credited hours</th></tr></thead>
          <tbody>{model.students.map(student => <tr key={student.id}><th scope="row">{student.name}</th><td>{student.program || 'Not recorded'}</td><td>{student.company || 'Not assigned'}</td><td>{student.placementStatus ? <StatusBadge status={student.placementStatus} /> : 'Not recorded'}</td><td>{student.checklist?.required != null ? `${student.checklist.verified}/${student.checklist.required} verified` : 'Unavailable'}</td><td>{student.hours}</td></tr>)}</tbody>
        </table>
      </div> : <Card><EmptyState title="No students in scope" description="Students will appear when college records are available." icon="users" /></Card>}
    </section>

    <section className="coordinator-quick-links" aria-label="Coordinator tools">
      <Button variant="secondary" onClick={() => onNavigate?.('placement')}>Placement review</Button>
      <Button variant="secondary" onClick={() => onNavigate?.('alerts')}>Risk alerts</Button>
      <Button variant="secondary" onClick={() => onNavigate?.('partners')}>Host companies</Button>
    </section>
  </div>;
}
