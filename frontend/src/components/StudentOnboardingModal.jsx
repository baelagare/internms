import { useState } from 'react';
import { Button, Notice } from './ui.jsx';
import { Field, Modal, useMutation } from './workflow.jsx';
import { NEMSU_COLLEGES, NEMSU_COLLEGE_PROGRAMS } from '../config/institution.js';
import { submitOnboarding } from '../services/applicationService.js';

export function StudentOnboardingModal({ user, onClose, onChange }) {
  const [college, setCollege] = useState(user.college || '');
  const [program, setProgram] = useState(user.program || '');
  const [studentNumber, setStudentNumber] = useState(user.studentNumber || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [errors, setErrors] = useState({});
  const { run, busy, notice } = useMutation(onChange);

  const collegeOptions = [
    { value: '', label: 'Select Your College…' },
    ...Object.entries(NEMSU_COLLEGES).map(([code, meta]) => ({
      value: code,
      label: `${code} · ${meta.name}`
    }))
  ];

  const availablePrograms = college ? NEMSU_COLLEGE_PROGRAMS[college] || [] : [];
  const programOptions = [
    { value: '', label: college ? 'Select Your Degree Program…' : 'Choose A College First…' },
    ...availablePrograms.map(prog => ({ value: prog, label: prog }))
  ];

  function handleCollegeChange(event) {
    const nextCollege = event.target.value;
    setCollege(nextCollege);
    setProgram('');
    if (errors.college) setErrors(prev => ({ ...prev, college: null }));
  }

  function validate() {
    const errs = {};
    if (!college) errs.college = 'Please choose your enrolled college.';
    if (!program) errs.program = 'Please choose your degree program.';
    if (!studentNumber.trim()) errs.studentNumber = 'Please enter your student ID number.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    const success = await run(
      () => submitOnboarding(user, { college, program, studentNumber: studentNumber.trim(), phone: phone.trim() }),
      'Academic onboarding declaration submitted. Your enrollment is now pending coordinator review.'
    );

    if (success) {
      setTimeout(() => {
        onClose?.();
      }, 900);
    }
  }

  return (
    <Modal
      title="Academic Profile Onboarding"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <p className="text-sm text-muted leading-relaxed">
          Please confirm your official university college and program. Your declaration will be routed to your College OJT Coordinator for approval.
        </p>

        {notice}

        <Field
          label="College"
          required
          options={collegeOptions}
          value={college}
          error={errors.college}
          onChange={handleCollegeChange}
          hint="Select the college offering your degree program."
        />

        <Field
          label="Degree Program"
          required
          options={programOptions}
          value={program}
          error={errors.program}
          disabled={!college || availablePrograms.length === 0}
          onChange={event => {
            setProgram(event.target.value);
            if (errors.program) setErrors(prev => ({ ...prev, program: null }));
          }}
          hint={college ? `${availablePrograms.length} approved programs available in ${college}` : 'Select a college first to see its programs.'}
        />

        <Field
          label="Student ID Number"
          required
          placeholder="e.g. 2026-1001"
          value={studentNumber}
          error={errors.studentNumber}
          onChange={event => {
            setStudentNumber(event.target.value);
            if (errors.studentNumber) setErrors(prev => ({ ...prev, studentNumber: null }));
          }}
          hint="Your official NEMSU student identification number."
        />

        <Field
          label="Mobile Contact Number"
          placeholder="e.g. +63 900 000 0000"
          value={phone}
          onChange={event => setPhone(event.target.value)}
          hint="Optional mobile number for coordinator and host contact."
        />

        <div className="flex flex-wrap justify-end gap-3 pt-3 border-t border-line">
          {onClose && (
            <Button variant="secondary" type="button" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit for Verification'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
