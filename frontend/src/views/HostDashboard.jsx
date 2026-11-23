import { Button, Card, EmptyState, PageHeader, StatusBadge, SummaryMetrics } from '../components/ui.jsx';
import { hostDashboardModel } from '../services/hostDashboard.js';
import './hostDashboard.css';

export function HostDashboard({ user, db, onNavigate }) {
  const model = hostDashboardModel(db, user);
  if (!model.available) return <div className="host-dashboard"><PageHeader title="Company Dashboard" subtitle="Internship Work For Your Company." /><Card><EmptyState title="Company Records Unavailable" description="Host-company records are not connected yet. No workload or intern totals are assumed." /></Card></div>;
  return <div className="host-dashboard">
    <PageHeader title="Company Dashboard" subtitle={model.company} />
    <SummaryMetrics className="host-metrics" ariaLabel="Company review summary" items={[
      { label: 'Assigned Interns', value: model.students.length },
      { label: 'Reports To Review', value: model.pendingReports, detail: 'Waiting for supervisor verification' },
      { label: 'Attendance Requests', value: model.pendingAttendance, detail: 'Waiting for supervisor verification' },
      { label: 'Evaluations Recorded', value: model.completedEvaluations, detail: `${model.studentsWithEvaluations} interns have evaluation records` }
    ]} />
    <section aria-labelledby="host-queue-heading">
      <div className="host-section-heading"><div><h2 id="host-queue-heading">Review Work</h2><p>Open the relevant queue to review records.</p></div></div>
      <div className="host-actions"><Button onClick={() => onNavigate?.('approvals')}>Review submissions</Button><Button variant="secondary" onClick={() => onNavigate?.('evaluations')}>Open evaluations</Button><Button variant="secondary" onClick={() => onNavigate?.('postings')}>Edit job posting</Button></div>
    </section>
    <section aria-labelledby="host-interns-heading">
      <div className="host-section-heading"><div><h2 id="host-interns-heading">Assigned Interns</h2><p>Only students assigned to {model.company} are listed.</p></div><Button variant="quiet" onClick={() => onNavigate?.('interns')}>View all interns</Button></div>
      {model.students.length ? <div className="host-students" role="region" aria-label="Assigned intern records" tabIndex={0}><table><thead><tr><th scope="col">Intern</th><th scope="col">Program</th><th scope="col">Role</th><th scope="col">Placement</th><th scope="col">Credited hours</th><th scope="col">Reports to review</th></tr></thead><tbody>
        {model.students.map(student => <tr key={student.id}><th scope="row">{student.name}</th><td>{student.program || 'Not recorded'}</td><td>{student.role || 'Not recorded'}</td><td>{student.status ? <StatusBadge status={student.status} /> : 'Not recorded'}</td><td>{student.creditedHours == null ? 'Unavailable' : student.creditedHours}</td><td>{student.pendingReports + student.pendingAttendance}</td></tr>)}
      </tbody></table></div> : <Card><EmptyState title="No Interns Assigned" description="Assigned interns will appear when company and student records are available." icon="users" /></Card>}
    </section>
  </div>;
}
