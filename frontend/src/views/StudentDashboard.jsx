import { useState } from 'react';
import { Button, Card, Notice, PageHeader, ProgressBar, Skeleton, StatusBadge } from '../components/ui.jsx';
import { Modal } from '../components/workflow.jsx';
import { EvaluationDetails } from './Evaluations.jsx';
import { studentDashboardModel } from '../services/studentDashboard.js';
import './studentDashboard.css';

export function StudentDashboard({ user, db, loading = false, error = '', onRetry }) {
  const [preview, setPreview] = useState(false);
  const model = studentDashboardModel(user, db);
  let body;
  if (loading) body = <div className="student-dashboard-loading"><Skeleton label="Loading internship overview" lines={3} /><Skeleton label="Loading internship records" lines={5} /></div>;
  else if (error) body = <Notice tone="danger" title="Dashboard could not be loaded" action={onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}>{typeof error === 'string' ? error : 'Your records could not be loaded.'}</Notice>;
  else if (!model.available) body = <Card className="student-dashboard-unavailable"><h2>Dashboard unavailable</h2><p>Student records are not connected yet. Your internship overview will appear here when they are available.</p><p>No progress or placement status has been assumed.</p></Card>;
  else body = <>
    {model.action && <section className="student-dashboard-action" aria-labelledby="dashboard-action-heading"><div><h2 id="dashboard-action-heading">{model.action.title}</h2><p>{model.action.description}</p></div><Destination route={model.action.route} primary>{model.action.label}</Destination></section>}
    {model.clearanceStatus === 'Cleared & Certified' && <Notice tone="success" title="Clearance recorded">Your record is marked cleared and certified.</Notice>}
    <section aria-labelledby="dashboard-overview-heading"><h2 id="dashboard-overview-heading" className="student-dashboard-section-title">Internship overview</h2>
      <div className="student-dashboard-grid">
        <Card aria-labelledby="dashboard-documents"><h3 id="dashboard-documents">Documents</h3>
          {model.required ? <><p className="student-dashboard-value">{model.verified} of {model.required} verified</p><ProgressBar label="Document verification" value={model.verified} max={model.required} /></> : <p>Document requirements are unavailable.</p>}
          <Destination route="checklist">View checklist</Destination>
        </Card>
        <Card aria-labelledby="dashboard-hours"><h3 id="dashboard-hours">OJT hours</h3>
          <p className="student-dashboard-value">{model.hours == null ? 'Hours unavailable' : model.hours + ' hours recorded'}</p>
          {model.quota != null && model.hours != null ? <><p>{model.quota} required hours</p><ProgressBar label="Recorded OJT hours" value={model.hours} max={model.quota} /></> : <p>{model.quota == null ? 'Required hours are not configured.' : 'Attendance records are unavailable.'}</p>}
          <p className="student-dashboard-note">Includes supervisor-verified and coordinator-approved logs.</p><Destination route="attendance">View attendance</Destination>
        </Card>
        <Card aria-labelledby="dashboard-placement"><h3 id="dashboard-placement">Placement</h3>
          <p className="student-dashboard-value">{model.company || (model.placementStatus === 'Unplaced' ? 'No host company assigned' : 'Assignment unavailable')}</p>
          {model.placementStatus && <StatusBadge status={model.placementStatus} />}
          {model.assignedRole && <p>{model.assignedRole}</p>}
          {model.deploymentStartDate && <p>Start date: {model.deploymentStartDate}</p>}
          <Destination route="placement">View placement</Destination>
        </Card>
        <Card aria-labelledby="dashboard-evaluation"><h3 id="dashboard-evaluation">Evaluation and clearance</h3>
          {model.evaluation ? <><p>Evaluation recorded.</p><Button variant="secondary" onClick={() => setPreview(true)}>View evaluation</Button></> : <p>{model.evaluationsAvailable ? 'No evaluation recorded yet.' : 'Evaluation records are unavailable.'}</p>}
          <p>Clearance: {model.clearanceStatus || 'Not recorded'}</p>
        </Card>
      </div>
    </section>
    <Card className="student-dashboard-messages" aria-labelledby="dashboard-messages"><div className="student-dashboard-section-header"><h2 id="dashboard-messages">Coordinator messages</h2><Destination route="messages">Open messages</Destination></div>
      {model.advisories == null ? <p>Coordinator messages are unavailable.</p> : model.advisories.length === 0 ? <p>No coordinator advisories recorded.</p> : <ul>{model.advisories.map((message, index) => <li key={message.id ?? index}><details><summary>{message.ruleLabel || 'Coordinator advisory'}</summary><p className="student-dashboard-message">{message.finalDispatchedText}</p></details></li>)}</ul>}
    </Card>
    {preview && model.evaluation && <Modal title="Supervisor evaluation" onClose={() => setPreview(false)}><EvaluationDetails evaluation={model.evaluation} /><Button variant="secondary" onClick={() => window.print()}>Print evaluation</Button></Modal>}
  </>;
  return <div className="student-dashboard"><PageHeader title="Dashboard" subtitle="Your internship overview." />{body}</div>;
}

function Destination({ route, children, primary = false }) {
  return <a href={'#/student/' + route} className={primary ? 'student-dashboard-link student-dashboard-link--primary' : 'student-dashboard-link'}>{children}</a>;
}
