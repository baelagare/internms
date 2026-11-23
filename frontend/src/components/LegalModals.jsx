import { Button } from './ui.jsx';
import { Modal } from './workflow.jsx';

export function PrivacyNoticeModal({ onClose }) {
  return (
    <Modal title="Privacy Notice · NEMSU InternMS" onClose={onClose}>
      <div className="space-y-4 text-sm leading-relaxed text-ink">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Effective Academic Year 2026–2027 · Republic Act No. 10173 (Data Privacy Act of 2012)
        </p>

        <section className="space-y-1.5">
          <h3 className="font-semibold text-ink">1. Institutional Commitment</h3>
          <p className="text-muted">
            North Eastern Mindanao State University (NEMSU) respects your right to privacy and is committed to protecting personal data processed through the Internship Management System (InternMS) in compliance with Republic Act No. 10173 (Data Privacy Act of 2012), its Implementing Rules and Regulations, and CHED Memorandum Order No. 104, Series of 2017.
          </p>
        </section>

        <section className="space-y-1.5">
          <h3 className="font-semibold text-ink">2. Information We Collect</h3>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li><strong>Student Interns:</strong> Institutional email, student number, college and degree program, GPA, skills and coursework portfolio, pre-deployment clearance documents (résumé, MOA, medical certificate, parent consent, insurance), daily attendance logs, camera verification snapshots, weekly task reports, and supervisor evaluations.</li>
            <li><strong>Host Training Establishment (HTE) Representatives:</strong> Full name, business email, company affiliation, role details, attendance verifications, and intern performance ratings.</li>
            <li><strong>University Coordinators &amp; Administrators:</strong> Institutional identity, college assignment, review decisions, risk alert interventions, and system audit logs.</li>
          </ul>
        </section>

        <section className="space-y-1.5">
          <h3 className="font-semibold text-ink">3. Purpose of Processing</h3>
          <p className="text-muted">
            Collected data is used strictly for academic internship administration: verifying pre-deployment eligibility, matching interns with accredited host partners, tracking required OJT hours, facilitating supervisor verification, supporting early-warning academic interventions, and certifying final university clearance.
          </p>
        </section>

        <section className="space-y-1.5">
          <h3 className="font-semibold text-ink">4. Data Sharing, Security &amp; Retention</h3>
          <p className="text-muted">
            Access is strictly scoped by role and college boundaries. Student records are shared only with authorized College OJT Coordinators, University Administrators, and the specific Host Training Establishment where the intern is placed. All records are transmitted over encrypted channels and retained in accordance with university archival policies.
          </p>
        </section>

        <section className="space-y-1.5">
          <h3 className="font-semibold text-ink">5. Your Rights &amp; Contact</h3>
          <p className="text-muted">
            Under the Data Privacy Act of 2012, you have the right to be informed, to access your records, to request correction of inaccurate data, and to raise privacy concerns. For inquiries, contact your College OJT Coordinator or the NEMSU Data Protection Officer at Main Campus, Tandag City, Surigao del Sur.
          </p>
        </section>

        <div className="flex justify-end border-t border-line pt-4">
          <Button type="button" variant="primary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

export function TermsOfUseModal({ onClose }) {
  return (
    <Modal title="Terms of Use · NEMSU InternMS" onClose={onClose}>
      <div className="space-y-4 text-sm leading-relaxed text-ink">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          NEMSU Student Internship Policy Manual (2026) · CHED CMO No. 104, s. 2017
        </p>

        <section className="space-y-1.5">
          <h3 className="font-semibold text-ink">1. Acceptance &amp; Authorized Access</h3>
          <p className="text-muted">
            By accessing InternMS, you agree to comply with these Terms of Use and all applicable university regulations. Institutional accounts (students, coordinators, and administrators) must authenticate exclusively via official <code className="text-xs">@nemsu.edu.ph</code> Google Workspace credentials. Host company representatives must register using an authorized invitation token issued by the university.
          </p>
        </section>

        <section className="space-y-1.5">
          <h3 className="font-semibold text-ink">2. Integrity of Submissions &amp; Academic Honesty</h3>
          <p className="text-muted">
            Student interns must submit truthful, accurate, and authentic records—including pre-deployment clearances, daily time-in/time-out logs, live verification snapshots, and weekly accomplishment reports. Falsification of attendance, tampering with documents, or misrepresentation of training activities constitutes a serious disciplinary offense under the NEMSU Student Handbook.
          </p>
        </section>

        <section className="space-y-1.5">
          <h3 className="font-semibold text-ink">3. Host Supervisor &amp; Coordinator Responsibilities</h3>
          <p className="text-muted">
            Host company supervisors agree to assign tasks aligned with the intern’s academic curriculum, verify attendance logs promptly, and provide fair, objective performance evaluations. College OJT Coordinators retain final authority over placement endorsements, credited OJT hours, risk alert interventions, and final clearance certification.
          </p>
        </section>

        <section className="space-y-1.5">
          <h3 className="font-semibold text-ink">4. Decision Support &amp; Human Oversight</h3>
          <p className="text-muted">
            Automated placement recommendations and early-warning risk indicators are advisory tools only. No automated indicator constitutes a final academic finding or disciplinary action without explicit human review and confirmation by an authorized coordinator or administrator.
          </p>
        </section>

        <section className="space-y-1.5">
          <h3 className="font-semibold text-ink">5. System Governance &amp; Auditability</h3>
          <p className="text-muted">
            All administrative actions, placement approvals, document verifications, and alert reviews are recorded in an institutional audit trail. Unauthorized access attempts, credential sharing, or misuse of platform data may result in account suspension and administrative sanctions.
          </p>
        </section>

        <div className="flex justify-end border-t border-line pt-4">
          <Button type="button" variant="primary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

