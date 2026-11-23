const normalize = value => String(value || '').trim().toLowerCase();
const list = value => Array.isArray(value) ? value.map(item => normalize(item)).filter(Boolean) : [];
const number = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;

function studentSkills(student = {}) {
  return list(student.skills || student.portfolioData?.skills);
}

function studentCoursework(student = {}) {
  return list(student.coursework || student.portfolioData?.coursework);
}

function hostSkills(host = {}) {
  return list(host.requiredSkills);
}

function hasProgramMatch(student = {}, host = {}) {
  const studentCollege = normalize(student.college || student.college_code);
  const hostCollege = normalize(host.college || host.college_code);
  if (!studentCollege || !hostCollege) return null;
  return studentCollege === hostCollege;
}

function capacityFor(host = {}, student = {}) {
  const filled = number(host.filledSlots);
  const max = number(host.maxSlots);
  if (filled === null || max === null || filled < 0 || max < 0) return null;
  const assigned = normalize(student.company) === normalize(host.name);
  return { filled, max, available: Math.max(0, max - filled), pass: max > filled || assigned };
}

export function placementEligibility(student = {}, host = null, settings = {}) {
  const college = hasProgramMatch(student, host || {});
  const gpa = number(student.gpa);
  const cutoff = number(host?.minGpa) ?? number(settings?.[student.college || student.college_code]?.maxGpaCutoff);
  const clearance = student.disciplinaryClearance || student.disciplinary_clearance;
  const docs = Array.isArray(student.preDeploymentDocs) ? student.preDeploymentDocs : null;
  const capacity = host ? capacityFor(host, student) : null;
  const gates = {
    collegeMatch: {
      pass: college,
      label: 'College Eligibility',
      detail: college === null ? 'College information is not recorded.' : college ? 'Student and host college are aligned.' : 'This host is scoped to a different college.'
    },
    gpaCutoff: {
      pass: gpa === null || gpa <= 0 || cutoff === null ? null : gpa <= cutoff,
      label: 'GPA Requirement',
      detail: gpa === null ? 'GPA is not recorded.' : cutoff === null ? 'No GPA cutoff is recorded for this host.' : `${gpa.toFixed(2)} GPA against maximum allowed ${cutoff.toFixed(2)}.`
    },
    disciplinaryClearance: {
      pass: clearance ? /clear|certif/i.test(clearance) : null,
      label: 'Disciplinary Clearance',
      detail: clearance || 'Clearance is not recorded.'
    },
    preDeploymentDocs: {
      pass: docs === null ? null : docs.length === 0 ? null : docs.every(doc => doc.status === 'Verified'),
      label: 'Document Checklist',
      detail: docs === null ? 'Document requirements are unavailable.' : `${docs.filter(doc => doc.status === 'Verified').length} of ${docs.length} documents verified.`
    },
    slotAvailability: {
      pass: capacity?.pass ?? null,
      label: 'Slot Availability',
      detail: capacity ? `${capacity.available} open of ${capacity.max} total slots.` : 'Host capacity is not recorded.'
    }
  };
  const hardGates = ['collegeMatch', 'gpaCutoff', 'disciplinaryClearance', 'slotAvailability'];
  const hardEligible = hardGates.every(key => gates[key].pass === true);
  return { hardEligible: hardGates.some(key => gates[key].pass === null) ? null : hardEligible, gates };
}

export function placementRankings(student = {}, hosts = [], settings = {}) {
  if (!Array.isArray(hosts)) return [];
  const skills = studentSkills(student);
  const coursework = studentCoursework(student);
  const gpa = number(student.gpa);
  const results = hosts.filter(host => !host.college || !student.college || normalize(host.college) === normalize(student.college)).map(host => {
    const displayRequiredSkills = Array.isArray(host.requiredSkills) ? host.requiredSkills.map(item => String(item || '').trim()).filter(Boolean) : [];
    const requiredSkills = displayRequiredSkills.map(normalize);
    const matchingSkills = requiredSkills.filter(skill => skills.some(value => value === skill || value.includes(skill) || skill.includes(value)));
    const skillsGap = requiredSkills.filter(skill => !matchingSkills.includes(skill));
    const displaySkills = displayRequiredSkills.filter(skill => matchingSkills.includes(normalize(skill)));
    const displayGaps = displayRequiredSkills.filter(skill => skillsGap.includes(normalize(skill)));
    const matchingCoursework = coursework.filter(course => requiredSkills.some(skill => course.includes(skill) || skill.includes(course)));
    const collegeMatch = hasProgramMatch(student, host);
    const cutoff = number(host.minGpa) ?? number(settings?.[student.college || student.college_code]?.maxGpaCutoff);
    const capacity = capacityFor(host, student);
    const eligibility = placementEligibility(student, host, settings);
    const skillScore = requiredSkills.length ? matchingSkills.length / requiredSkills.length : 0.5;
    const courseworkScore = requiredSkills.length ? Math.min(1, matchingCoursework.length / Math.max(1, requiredSkills.length)) : 0.5;
    const gpaScore = gpa !== null && gpa > 0 && cutoff !== null && cutoff > 0 ? Math.min(1, cutoff / gpa) : 0.5;
    const collegeScore = collegeMatch === true ? 1 : collegeMatch === false ? 0 : 0.5;
    const capacityScore = capacity === null ? 0.5 : capacity.available > 0 || capacity.pass ? 1 : 0;
    const matchPercent = Math.round((skillScore * 0.45 + courseworkScore * 0.2 + gpaScore * 0.15 + collegeScore * 0.1 + capacityScore * 0.1) * 100);
    return {
      hteId: host.id,
      company: host.name,
      roleTitle: host.roleTitle,
      location: host.location,
      description: host.description,
      supervisorName: host.supervisorName,
      matchPercent,
      matchingSkills: displaySkills,
      skillsGap: displayGaps,
      matchingCoursework,
      eligibility,
      evidence: { skillScore, courseworkScore, gpaScore, collegeScore, capacityScore, cutoff }
    };
  });
  return results.sort((a, b) => b.matchPercent - a.matchPercent || String(a.company).localeCompare(String(b.company)))
    .map((match, index) => ({ ...match, rank: index + 1 }));
}
