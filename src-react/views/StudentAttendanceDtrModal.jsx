import { useRef } from 'react';
import { Button } from '../components/ui.jsx';
import { Icon } from '../components/Icons.jsx';
import { formatDateDisplay } from '../services/studentAttendance.js';

export function StudentAttendanceDtrModal({ user, db, records = [], period = 'ALL', onClose }) {
  const printRef = useRef(null);
  const college = user.college || 'CITE';
  const settings = db.collegeSettings?.[college] || {};
  const requiredHours = settings.requiredHours || 324;

  const sortedRecords = [...records].sort((a, b) => (a.date > b.date ? 1 : -1));
  const totalPeriodHours = sortedRecords.reduce((sum, r) => sum + Number(r.hours || 0), 0);
  const approvedPeriodHours = sortedRecords
    .filter(r => ['Approved', 'Coordinator Approved', 'Supervisor Verified'].includes(r.status))
    .reduce((sum, r) => sum + Number(r.hours || 0), 0);

  const coordinator = (db.users || []).find(
    u => u.role === 'coordinator' && (u.college === college || college === 'ALL')
  );
  const supervisor = (db.users || []).find(
    u => u.role === 'supervisor' && u.company === user.company
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="dtr-print-modal-content">
      <div className="dtr-print-toolbar no-print">
        <div>
          <p className="text-xs font-bold text-navy-900">Printable Daily Time Record</p>
          <p className="text-xs text-slate-500">
            {sortedRecords.length} records selected · {totalPeriodHours.toFixed(1)} recorded hours ({approvedPeriodHours.toFixed(1)} verified/approved)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={handlePrint}>
            <Icon name="printer" size={16} />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      <article className="print-sheet print-report" ref={printRef}>
        <header className="print-letterhead">
          <img src="/internms-logo.svg" alt="NEMSU Seal" className="print-letterhead-logo" />
          <div className="print-letterhead-center">
            <div className="print-sup">Republic of the Philippines</div>
            <div className="print-univ-name">North Eastern Mindanao State University</div>
            <div className="print-campus">Main Campus · Rosario, Tandag City, Surigao del Sur</div>
            <div className="print-office">
              Office of Student Internship Program (SIPP) · {db.academicYear || 'A.Y. 2026–2027'}
            </div>
          </div>
          <div style={{ width: 56 }} aria-hidden="true" />
        </header>

        <div className="print-doc-title">
          <h2>DAILY TIME RECORD (DTR)</h2>
          <p>Official Student Intern Attendance &amp; Training Hours Record</p>
        </div>

        <div className="print-student-info-grid">
          <div>
            <dt>Student Intern Name:</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>Student ID Number:</dt>
            <dd>{user.studentNumber || user.id}</dd>
          </div>
          <div>
            <dt>Degree Program &amp; College:</dt>
            <dd>{user.program || college} ({college})</dd>
          </div>
          <div>
            <dt>Host Training Establishment:</dt>
            <dd>{user.company || 'Host Training Establishment'}</dd>
          </div>
          <div>
            <dt>Reporting Period:</dt>
            <dd>{period === 'ALL' ? 'Complete Deployment Record' : period}</dd>
          </div>
          <div>
            <dt>Total Program Quota:</dt>
            <dd>{requiredHours} Required OJT Hours</dd>
          </div>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th rowSpan="2" style={{ width: '18%' }}>Date</th>
              <th colSpan="2">Morning (AM)</th>
              <th colSpan="2">Afternoon (PM)</th>
              <th rowSpan="2" style={{ width: '10%' }}>Recorded Hours</th>
              <th rowSpan="2" style={{ width: '22%' }}>Verification Status</th>
            </tr>
            <tr>
              <th style={{ width: '12%' }}>Time In</th>
              <th style={{ width: '12%' }}>Time Out</th>
              <th style={{ width: '12%' }}>Time In</th>
              <th style={{ width: '12%' }}>Time Out</th>
            </tr>
          </thead>
          <tbody>
            {sortedRecords.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  No daily time records on file for the selected reporting period.
                </td>
              </tr>
            ) : (
              sortedRecords.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600, textAlign: 'left' }}>{formatDateDisplay(item.date)}</td>
                  <td>{item.amIn && item.amIn !== '-' ? item.amIn : '—'}</td>
                  <td>{item.amOut && item.amOut !== '-' ? item.amOut : '—'}</td>
                  <td>{item.pmIn && item.pmIn !== '-' ? item.pmIn : '—'}</td>
                  <td>{item.pmOut && item.pmOut !== '-' ? item.pmOut : '—'}</td>
                  <td style={{ fontWeight: 700 }}>{Number(item.hours || 0).toFixed(1)}</td>
                  <td style={{ fontSize: '10px', textAlign: 'left' }}>
                    <strong>{item.status}</strong>
                    {item.supervisorVerifiedBy && <span style={{ display: 'block', color: '#475569' }}>Sup: {item.supervisorVerifiedBy}</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {sortedRecords.length > 0 && (
            <tfoot>
              <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                <td colSpan="5" style={{ textAlign: 'right', paddingRight: '12px' }}>
                  TOTAL PERIOD HOURS:
                </td>
                <td>{totalPeriodHours.toFixed(1)} hrs</td>
                <td style={{ fontSize: '10px', textAlign: 'left' }}>
                  {approvedPeriodHours.toFixed(1)} hrs officially verified / approved
                </td>
              </tr>
            </tfoot>
          )}
        </table>

        <div style={{ marginTop: '14px', fontSize: '10px', color: '#526074', lineHeight: 1.5 }}>
          <p>
            * Note: Attendance timestamps are recorded through InternMS authorized capture checkpoints. Hours are officially credited toward OJT fulfillment only upon verification by the designated Host Training Establishment (HTE) supervisor and approval by the College SIPP Coordinator in accordance with CHED CMO No. 104, s. 2017.
          </p>
        </div>

        <div className="print-signatures">
          <div>
            <div className="print-sig-line">
              <div className="print-sig-name">{user.name}</div>
              <div className="print-sig-title">Student Intern (Signature over Printed Name)</div>
            </div>
          </div>
          <div>
            <div className="print-sig-line">
              <div className="print-sig-name">{supervisor?.name || 'Authorized HTE Supervisor'}</div>
              <div className="print-sig-title">HTE Industry Supervisor / Mentor</div>
            </div>
          </div>
          <div>
            <div className="print-sig-line">
              <div className="print-sig-name">{coordinator?.name || 'College SIPP Coordinator'}</div>
              <div className="print-sig-title">College OJT / SIPP Coordinator</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '9px', color: '#94a3b8' }}>
          System Document ID: DTR-{user.id}-{period || 'ALL'}-{new Date().toISOString().slice(0, 10)} · InternMS NEMSU Main Campus
        </div>
      </article>
    </div>
  );
}