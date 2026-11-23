import { Button, Card, EmptyState, PageHeader, StatusBadge, SummaryMetrics } from '../components/ui.jsx';
import { hostInternsModel } from '../services/hostInterns.js';
import './hostInterns.css';

export function HostInternDirectory({ user, db = {}, onNavigate }) {
  const model = hostInternsModel(db, user);
  const handleNavigate = onNavigate || (key => { window.location.hash = `#/${user?.role || 'supervisor'}/${key}`; });
  if (!model.available) return <div className="host-interns"><PageHeader title="Assigned Interns" subtitle="Student records for your host company." /><Card><EmptyState title="Intern Records Unavailable" description="Company-scoped student records are not connected yet." /></Card></div>;
  return <div className="host-interns">
    <PageHeader title="Assigned Interns" subtitle={`Students assigned to ${model.company}.`} />
    <SummaryMetrics className="host-intern-summary" ariaLabel="Assigned intern summary" items={[
      { label: 'Assigned Interns', value: model.students.length },
      { label: 'With Work To Review', value: model.students.filter(item => item.pendingReports > 0 || item.pendingAttendance > 0).length },
      { label: 'Evaluations Recorded', value: model.students.filter(item => item.evaluationRecorded === true).length }
    ]} />
    {model.students.length ? <div className="host-intern-list" role="region" aria-label="Assigned intern records" tabIndex={0}>
      <table><thead><tr><th scope="col">Intern</th><th scope="col">Program</th><th scope="col">Role</th><th scope="col">Placement</th><th scope="col">Credited hours</th><th scope="col">Waiting on you</th><th scope="col">Evaluation</th></tr></thead>
        <tbody>{model.students.map(student => <tr key={student.id}>
          <th scope="row">{student.name || 'Name not recorded'}</th><td>{student.program || 'Not recorded'}</td><td>{student.role || 'Not recorded'}</td>
          <td>{student.placementStatus ? <StatusBadge status={student.placementStatus} /> : 'Not recorded'}</td>
          <td>{student.hoursAvailable ? student.creditedHours == null ? 'Unavailable' : `${student.creditedHours} hours` : 'Unavailable'}</td>
          <td>{student.pendingReports == null || student.pendingAttendance == null ? 'Unavailable' : student.pendingReports + student.pendingAttendance}</td>
          <td>{student.evaluationRecorded == null ? 'Unavailable' : student.evaluationRecorded ? 'Recorded' : 'Not recorded'}</td>
        </tr>)}</tbody>
      </table>
    </div> : <Card><EmptyState title="No Interns Assigned" description="Students will appear when they are assigned to your company." icon="users" /></Card>}
    <section className="host-intern-actions" aria-label="Intern actions">
      <Button onClick={() => handleNavigate('approvals')}>Review Submissions</Button>
      <Button variant="secondary" onClick={() => handleNavigate('evaluations')}>Open Evaluations</Button>
    </section>
  </div>;
}
