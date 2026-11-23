import { Button, Card, EmptyState, Notice, PageHeader, StatusBadge, SummaryMetrics } from '../components/ui.jsx';
import { coordinatorDashboardModel } from '../services/coordinatorDashboard.js';
import './coordinatorDashboard.css';

export function CoordinatorDashboard({ user, db, onNavigate }) {
  const model = coordinatorDashboardModel(db, user);
  if (!model.available) return <div className="coordinator-dashboard"><PageHeader title="Coordinator Dashboard" subtitle="Review Work For Your College." /><Card><EmptyState title="Dashboard Data Unavailable" description="Coordinator records are not connected yet. No cohort totals or review counts are assumed." /></Card></div>;

  const firstTasks = model.pendingItems.slice(0, 5);
  return <div className="coordinator-dashboard">
    <PageHeader title="Coordinator Dashboard" subtitle={`OJT activity for ${model.college}.`} />
    <SummaryMetrics className="coordinator-metrics" ariaLabel="Cohort Overview" items={[
      { label: 'Interns in Scope', value: model.studentsCount },
      { label: 'Needs Review', value: model.pendingCount, detail: `${model.pendingWeeklyReports} weekly reports · ${model.pendingAttendanceAdjustments} attendance requests` },
      { label: 'Placement Preferences', value: model.pendingPlacements, detail: 'Awaiting coordinator endorsement' },
      { label: 'Active Risk Alerts', value: model.activeAlertsCount }
    ]} />

    {model.students.filter(s => s.enrollmentStatus === 'PENDING_APPROVAL').length > 0 && (
      <Notice
        tone="warning"
        title="Pending Student Enrollments"
        action={<Button variant="primary" size="sm" onClick={() => onNavigate?.('interns')}>Review in intern directory</Button>}
      >
        {model.students.filter(s => s.enrollmentStatus === 'PENDING_APPROVAL').length} student(s) have declared {model.college} as their college and are awaiting your enrollment approval.
      </Notice>
    )}

    <section aria-labelledby="coordinator-actions-heading">
      <div className="coordinator-section-heading"><div><h2 id="coordinator-actions-heading">Review Queue</h2><p>Items awaiting your review.</p></div>
        <Button variant="secondary" onClick={() => onNavigate?.('approvals')}>Open Approvals</Button>
      </div>
      {firstTasks.length ? <ul className="coordinator-queue">
        {firstTasks.map((item, index) => <li key={item.id ?? `${item.type}-${index}`}><Card className="coordinator-queue-item">
          <div className="coordinator-queue-copy"><StatusBadge tone="warning">{item.type}</StatusBadge><h3>{item.label}</h3><p>{item.studentName}</p></div>
          <Button variant="secondary" onClick={() => {
            if (item.category && item.targetId != null) {
              onNavigate?.(item.route, { category: item.category, id: item.targetId, studentId: item.studentId, student: item.studentName });
            } else if (item.route === 'placement' && item.studentId != null) {
              onNavigate?.('placement', { studentId: item.studentId });
            } else {
              onNavigate?.(item.route);
            }
          }}>Review</Button>
        </Card></li>)}
      </ul> : <Card><EmptyState title="No pending reviews" description="There are no review items in the available records." icon="clipboard" /></Card>}
    </section>

    {!model.checklistsAvailable && <Notice tone="info" title="Checklist totals unavailable">Document requirements have not been assigned in the available records.</Notice>}
    <section aria-labelledby="coordinator-cohort-heading">
      <div className="coordinator-section-heading"><div><h2 id="coordinator-cohort-heading">Cohort Overview</h2><p>Students scoped to your college.</p></div>
        <Button variant="secondary" onClick={() => onNavigate?.('interns')}>View Interns</Button>
      </div>
      {model.students.length ? <div className="coordinator-cohort" role="region" aria-label="Cohort records" tabIndex={0}>
        <table><thead><tr><th scope="col">Student</th><th scope="col">Program</th><th scope="col">Host company</th><th scope="col">Placement</th><th scope="col">Checklist</th><th scope="col">Credited hours</th></tr></thead>
          <tbody>{model.students.map(student => <tr key={student.id}><th scope="row">{student.name}</th><td>{student.program || 'Not recorded'}</td><td>{student.company || 'Not assigned'}</td><td>{student.placementStatus ? <StatusBadge status={student.placementStatus} /> : 'Not recorded'}</td><td>{student.checklist?.required != null ? `${student.checklist.verified}/${student.checklist.required} verified` : 'Unavailable'}</td><td>{student.hours}</td></tr>)}</tbody>
        </table>
      </div> : <Card><EmptyState title="No students in scope" description="Students will appear when college records are available." icon="users" /></Card>}
    </section>

    <section className="coordinator-quick-links" aria-label="Coordinator tools">
      <Button variant="secondary" onClick={() => onNavigate?.('placement')}>Placement Review</Button>
      <Button variant="secondary" onClick={() => onNavigate?.('alerts')}>Risk Alerts</Button>
      <Button variant="secondary" onClick={() => onNavigate?.('partners')}>Host Companies</Button>
    </section>
  </div>;
}
