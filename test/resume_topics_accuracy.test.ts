import assert from 'node:assert/strict';
import { chunkResumeText } from '../src/agent/rag/resumeChunker';
const text = `Jane Doe
Professional Profile
Software engineer building reliable tools for financial services teams.
Work Experience
Engineer at Example
Built fintech services handling 2 million requests per day.
Mentored 4 engineers in a cross-functional team.
Skills and Tools: TypeScript, React
Projects
Built Atlas using React.
Projects
Delivered Beacon using Python.
Education
Bachelor of Science, Example University, 2020
Certifications & Licenses
AWS Certified Developer, 2024
Spoken Languages
English (fluent), French (conversational)
Work Authorization: Authorized to work in Canada; no sponsorship required.
Availability: Available to start after 30 days notice period.
Salary Expectations: CAD 100,000 per year
Location Preferences: Prefer hybrid; willing to relocate to Toronto.
Security Clearance: No security clearance.
Publications and Research
Published a paper on distributed storage.
Awards and Achievements
Won a university research scholarship.
Voluntary EEO Responses
Gender: Female`;
const result = chunkResumeText(text);
for (const key of ['summary', 'experience', 'skills', 'workAuthorization', 'availability', 'compensation', 'relocation', 'securityClearance', 'projects', 'metrics', 'domainExpertise', 'education', 'leadership', 'certifications', 'languages', 'publications', 'awards']) {
  assert.ok(result[key], `Missing ${key}`);
}
assert.match(result.projects, /Atlas[\s\S]*Beacon/);
assert.match(result.metrics, /2 million requests/);
assert.match(result.languages, /French \(conversational\)/);
assert.equal(result.eeoDemographics, undefined);
assert.ok(!result.awards.includes('Gender'), 'EEO data must not leak into awards');
const minimal = chunkResumeText('Alex Doe\nSkills\nPython, SQL\nEducation\nExample University, India, 2019–2023');
for (const key of ['workAuthorization', 'availability', 'compensation', 'securityClearance', 'languages', 'certifications', 'eeoDemographics']) assert.equal(minimal[key], undefined);
const coding = chunkResumeText('Languages: Python, C++, SQL');
assert.equal(coding.languages, undefined);
assert.match(coding.skills, /C\+\+/);
const unheaded = chunkResumeText('Alex Doe\nExperienced developer building reliable services for healthcare teams.\nExperience\nBuilt an API reducing latency by 35%.');
assert.match(unheaded.summary, /Experienced developer/);
const fallback = chunkResumeText('Alex Doe\nExperience\nBuilt an API reducing latency by 35%.');
assert.equal(fallback.summary, 'Built an API reducing latency by 35%.');
assert.deepEqual(chunkResumeText('   '), {});
console.log('All resume topic extraction accuracy checks passed.');
