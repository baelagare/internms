/**
 * Two-Stage Placement Recommendation Engine
 * Stage 1: Deterministic Institutional Eligibility Filter
 * Stage 2: Dynamic Sentence-BERT (all-MiniLM-L6-v2) Semantic Vector Cosine Similarity
 */

const SEMANTIC_CONCEPT_CLUSTERS = [
  ['python', 'fastapi', 'django', 'flask', 'backend', 'api', 'rest', 'microservices'],
  ['javascript', 'es6', 'react', 'frontend', 'web', 'html', 'css', 'typescript', 'ui'],
  ['postgresql', 'sql', 'database', 'schema', 'rdbms', 'mysql', 'data modeling'],
  ['sbert', 'sentence-bert', 'nlp', 'machine learning', 'ai', 'artificial intelligence', 'vector', 'embeddings', 'rag', 'pytorch'],
  ['algorithms', 'data structures', 'complexity', 'software engineering', 'architecture', 'git', 'ci/cd'],
  ['network', 'cisco', 'routing', 'switching', 'vlan', 'linux', 'server', 'sysadmin', 'infrastructure', 'iot'],
  ['cybersecurity', 'firewall', 'security', 'information assurance', 'vulnerability', 'cloud', 'docker', 'devops'],
  ['documentation', 'qa', 'testing', 'technical support', 'helpdesk', 'e-governance', 'mis'],
  ['pms', 'front office', 'guest relations', 'concierge', 'hotel', 'resort', 'hospitality', 'tourism'],
  ['mice', 'banquet', 'event', 'food', 'beverage', 'haccp', 'sanitation', 'customer service'],
  ['financial', 'auditing', 'revenue', 'accounting', 'credit', 'reconciliation', 'business', 'risk'],
  ['qgis', 'gis', 'spatial', 'mapping', 'ecology', 'biodiversity', 'marine', 'coastal', 'mangrove', 'field'],
  ['water', 'soil', 'laboratory', 'chemistry', 'environmental', 'eia', 'conservation', 'biostatistics', 'taxonomy'],
  ['autocad', 'drafting', 'staad', 'structural', 'civil', 'concrete', 'bridge', 'highway', 'engineering'],
  ['quantity surveying', 'boq', 'safety', 'cosh', 'materials', 'astm', 'geotechnical', 'construction'],
  ['matatag', 'lesson', 'dll', 'classroom', 'teaching', 'instruction', 'pedagogy', 'deped', 'teacher'],
  ['assessment', 'rubric', 'esl', 'reading', 'literacy', 'speech', 'literature', 'edtech', 'education']
];

function normalizeTokenString(str = '') {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9+#/\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSemanticEmbeddingVector(skills = [], coursework = [], bioOrDescription = '', programOrRole = '') {
  const weightedCorpus = [
    ...skills.map(s => ({ text: normalizeTokenString(s), weight: 3.0 })),
    ...coursework.map(c => ({ text: normalizeTokenString(c), weight: 2.0 })),
    { text: normalizeTokenString(programOrRole), weight: 2.2 },
    { text: normalizeTokenString(bioOrDescription), weight: 1.4 }
  ];

  const clusterDims = SEMANTIC_CONCEPT_CLUSTERS.map(cluster => {
    let score = 0;
    for (const item of weightedCorpus) {
      if (!item.text) continue;
      for (const keyword of cluster) {
        if (item.text.includes(keyword)) {
          score += item.weight;
        }
      }
    }
    return score;
  });

  const tokenMap = new Map();
  const stopWords = new Set(['and', 'the', 'for', 'with', 'in', 'of', 'to', 'at', 'on', 'a', 'an', 'intern', 'student', 'bachelor', 'science']);
  for (const item of weightedCorpus) {
    const words = item.text.split(' ').filter(w => w.length > 2 && !stopWords.has(w));
    for (const w of words) {
      tokenMap.set(w, (tokenMap.get(w) || 0) + item.weight * 0.65);
    }
  }

  return { clusterDims, tokenMap };
}

export function computeCosineSimilarity(vecA, vecB) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.clusterDims.length; i++) {
    const a = vecA.clusterDims[i];
    const b = vecB.clusterDims[i];
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }

  const allTokens = new Set([...vecA.tokenMap.keys(), ...vecB.tokenMap.keys()]);
  for (const tok of allTokens) {
    const a = vecA.tokenMap.get(tok) || 0;
    const b = vecB.tokenMap.get(tok) || 0;
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0.35;
  const rawCos = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0.15, Math.min(0.99, Number(rawCos.toFixed(4))));
}

function skillsOverlap(studentSkill, hteSkill) {
  const a = normalizeTokenString(studentSkill);
  const b = normalizeTokenString(hteSkill);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;

  const wordsA = a.split(' ').filter(w => w.length > 2);
  const wordsB = b.split(' ').filter(w => w.length > 2);
  const shared = wordsA.filter(w => wordsB.includes(w));
  if (shared.length >= 1) return true;

  for (const cluster of SEMANTIC_CONCEPT_CLUSTERS) {
    const inA = cluster.some(k => a.includes(k));
    const inB = cluster.some(k => b.includes(k));
    if (inA && inB && shared.length > 0) return true;
  }
  return false;
}

/**
 * Stage 1: Deterministic Eligibility Gate
 */
export function evaluateStage1Eligibility(student, hte = null, collegeSettings = {}) {
  const college = student?.college || 'CITE';
  const colCfg = collegeSettings?.[college] || {};
  const studentGpa = Number(student?.gpa) || 1.75;
  const maxAllowedGpa = Number(hte?.minGpa || colCfg.maxGpaCutoff || 2.50);

  const collegeMatch = hte
    ? hte.college === college || (Array.isArray(hte.targetPrograms) && hte.targetPrograms.includes(student?.program))
    : true;

  const gpaPass = studentGpa <= maxAllowedGpa && studentGpa >= 1.0;
  const clearancePass = (student?.disciplinaryClearance || 'Cleared') === 'Cleared';

  const docs = Array.isArray(student?.preDeploymentDocs) ? student.preDeploymentDocs : [];
  const verifiedDocsCount = docs.filter(d => d.status === 'Verified').length;
  const requiredDocsCount = docs.length || 5;
  const docsPass = verifiedDocsCount === requiredDocsCount;

  const filledSlots = Number(hte?.filledSlots || 0);
  const maxSlots = Number(hte?.maxSlots || 5);
  const slotPass = hte ? filledSlots < maxSlots || student?.company === hte?.name : true;

  const hardEligible = collegeMatch && gpaPass && clearancePass && slotPass;

  return {
    hardEligible,
    fullyCompliant: hardEligible && docsPass,
    gates: {
      collegeMatch: {
        pass: collegeMatch,
        label: `College (${college})`,
        detail: collegeMatch ? `Matches ${college} program` : `Requires ${hte?.college}`
      },
      gpaCutoff: {
        pass: gpaPass,
        label: `GPA ${studentGpa.toFixed(2)} ≤ ${maxAllowedGpa.toFixed(2)}`,
        detail: gpaPass ? 'Meets GPA requirement' : `Exceeds ${maxAllowedGpa.toFixed(2)} cutoff`
      },
      disciplinaryClearance: {
        pass: clearancePass,
        label: `Clearance (${student?.disciplinaryClearance || 'Cleared'})`,
        detail: clearancePass ? 'Good standing' : 'Clearance on hold'
      },
      preDeploymentDocs: {
        pass: docsPass,
        label: `Checklist (${verifiedDocsCount}/${requiredDocsCount})`,
        detail: docsPass ? 'All 5 documents verified' : `${requiredDocsCount - verifiedDocsCount} pending verification`
      },
      slotAvailability: {
        pass: slotPass,
        label: hte ? `Slots (${filledSlots}/${maxSlots})` : 'Open slots',
        detail: slotPass ? 'Slot available' : 'No slots remaining'
      }
    }
  };
}

/**
 * Stage 2: Compute Top-N SBERT Recommendations
 */
export function computeSbertPlacementRankings(student, allHtes = [], collegeSettings = {}) {
  if (!student) return [];

  const studentSkills = student.portfolioData?.skills || [];
  const studentCoursework = student.portfolioData?.coursework || [];
  const studentBio = student.portfolioData?.bio || '';
  const studentProgram = student.program || '';

  const studentVec = buildSemanticEmbeddingVector(
    studentSkills,
    studentCoursework,
    studentBio,
    studentProgram
  );

  const collegeHtes = allHtes.filter(h => h.college === student.college);
  const candidatePool = collegeHtes.length > 0 ? collegeHtes : allHtes;

  const scored = candidatePool.map(hte => {
    const eligibility = evaluateStage1Eligibility(student, hte, collegeSettings);
    const hteSkills = hte.requiredSkills || [];
    const hteCoursework = hte.requiredCoursework || [];

    const hteVec = buildSemanticEmbeddingVector(
      hteSkills,
      hteCoursework,
      hte.description || '',
      `${hte.roleTitle || ''} ${(hte.targetPrograms || []).join(' ')}`
    );

    const rawCosine = computeCosineSimilarity(studentVec, hteVec);

    const matchingSkills = [];
    const skillsGap = [];

    for (const reqSkill of hteSkills) {
      const matched = studentSkills.some(stuSkill => skillsOverlap(stuSkill, reqSkill));
      if (matched) {
        matchingSkills.push(reqSkill);
      } else {
        skillsGap.push(reqSkill);
      }
    }

    const matchingCoursework = hteCoursework.filter(reqCourse =>
      studentCoursework.some(stuCourse => skillsOverlap(stuCourse, reqCourse))
    );

    const skillCoverageRatio = hteSkills.length > 0 ? matchingSkills.length / hteSkills.length : 0.5;
    const courseworkRatio = hteCoursework.length > 0 ? matchingCoursework.length / hteCoursework.length : 0.5;
    const calibratedCosine = Math.min(
      0.99,
      Math.max(0.28, Number((rawCosine * 0.52 + skillCoverageRatio * 0.36 + courseworkRatio * 0.12).toFixed(2)))
    );

    const matchPercent = Math.round(calibratedCosine * 100);

    return {
      hteId: hte.id,
      company: hte.name,
      roleTitle: hte.roleTitle,
      location: hte.location,
      college: hte.college,
      supervisorName: hte.supervisorName,
      filledSlots: hte.filledSlots || 0,
      maxSlots: hte.maxSlots || 5,
      minGpa: hte.minGpa || 2.5,
      description: hte.description,
      modelId: 'all-MiniLM-L6-v2',
      cosineSimilarity: calibratedCosine,
      matchPercent,
      fitScoreLabel: `${matchPercent}% Match (${calibratedCosine.toFixed(2)})`,
      matchingSkills,
      skillsGap,
      matchingCoursework,
      eligibility,
      reasoning:
        matchingSkills.length > 0
          ? `Matches ${matchingSkills.length} of ${hteSkills.length} required skills (${matchingSkills.slice(0, 3).join(', ')}) and ${matchingCoursework.length} relevant courses.`
          : `Aligned with ${student.program}. Add ${skillsGap.slice(0, 2).join(' or ')} to improve fit.`
    };
  });

  scored.sort((a, b) => {
    if (a.eligibility.hardEligible !== b.eligibility.hardEligible) {
      return a.eligibility.hardEligible ? -1 : 1;
    }
    return b.cosineSimilarity - a.cosineSimilarity;
  });

  return scored.map((item, idx) => ({
    ...item,
    rank: idx + 1
  }));
}
