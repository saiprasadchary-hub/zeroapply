import assert from 'node:assert/strict';
import { buildQuestionPrompt } from '../src/agent/localLlm/promptBuilder';
import { resolveQuestion } from '../src/agent/localLlm/questionResolver';
import type { PersonaData } from '../src/types';
import type { ScannedField } from '../src/agent/domScanner/fieldClassifier';

const mockPersona: PersonaData = {
  fullName: 'Kammari Sai Prasad Chary',
  location: 'Hyderabad, Telangana, India',
  email: 'kspchary077@gmail.com',
  phone: '+91 83743 70572',
  linkedIn: 'https://linkedin.com/in/kspchary',
  gitHub: 'https://github.com/saiprasadchary-hub',
  experienceYears: 2,
  minSalary: 25,
  workPreference: 'Remote',
  techStack: ['Python', 'TypeScript', 'React', 'FastAPI', 'Node.js'],
  targetRoles: ['Full Stack AI Engineer', 'Software Engineer'],
  education: "Bachelor's of Technology in Computer Science (2021 - 2025)",
  experienceSummary: 'Passionate student and software developer building autonomous systems and web applications.',
  resumeChunks: {
    summary: 'Engineering student with extensive experience in React, TypeScript, and AI agent architectures.',
    skills: 'Python, TypeScript, React, Next.js, Node.js, REST APIs, Git, PostgreSQL',
    projects: 'Impulse Search (500+ users), ZeroApply Autonomous Agent, Microservice Orchestrator',
    education: "Bachelor's of Technology in Computer Science (2021 - 2025)",
  },
};

function makeField(
  label: string,
  name = '',
  id = '',
  inputType = 'text',
  options: string[] = []
): ScannedField {
  return {
    id,
    selector: id ? `#${id}` : `input[name="${name}"]`,
    tagName: inputType === 'select' ? 'select' : 'input',
    inputType,
    label,
    placeholder: '',
    name,
    required: true,
    currentValue: '',
    options: options.length > 0 ? options : undefined,
  };
}

async function runStudentPersonaTests() {
  console.log('======================================================================');
  console.log('🧪 TESTING STUDENT APPLICANT LLM PERSONA & HIGH-ACCURACY RESOLVER');
  console.log('======================================================================\n');

  // Test 1: Prompt Builder adopts authentic student applicant persona
  console.log('1. Verifying PromptBuilder first-person student identity...');
  const prompt = buildQuestionPrompt({
    question: 'Why should we hire you for this role?',
    persona: mockPersona,
    inputType: 'textarea',
    jobContext: {
      jobTitle: 'Software Engineer Intern',
      companyName: 'TechCorp',
    },
  });

  assert.ok(
    prompt.systemPrompt.includes('ambitious, dedicated university student and software engineer'),
    'System prompt must frame LLM as ambitious student and software engineer'
  );
  assert.ok(
    prompt.systemPrompt.includes('FIRST PERSON ("I", "my", "me")'),
    'System prompt must enforce first-person perspective'
  );
  assert.ok(
    prompt.systemPrompt.includes('NEVER confuse your personal full name with a company'),
    'System prompt must strictly guard against company/name confusion'
  );
  assert.ok(
    prompt.userPrompt.includes('MY PROFILE & RESUME (I am the Applicant):'),
    'User prompt must be framed as the applicant resume'
  );
  assert.ok(
    prompt.userPrompt.includes('- My Current Status: University Student & Software Engineer'),
    'User prompt must include student status'
  );
  console.log('  ✓ System and User prompts successfully embody student applicant persona.');

  // Test 2: Student Enrollment / Status Question
  console.log('2. Verifying Student / Enrolled status resolution...');
  const studentField = makeField(
    'Are you currently enrolled in a college or university as a student?',
    'isStudent',
    '',
    'radio',
    ['Yes', 'No']
  );
  const studentRes = await resolveQuestion(studentField, mockPersona);
  assert.equal(studentRes.answer, 'Yes', 'Student query must resolve to "Yes"');

  const studentSelectField = makeField(
    'Current Educational / Employment Status',
    'eduStatus',
    '',
    'select',
    ['Student / Recent Graduate', 'Employed Full-Time', 'Other']
  );
  const studentSelectRes = await resolveQuestion(studentSelectField, mockPersona);
  assert.equal(
    studentSelectRes.answer,
    'Student / Recent Graduate',
    'Educational status dropdown must pick Student / Recent Graduate'
  );
  console.log('  ✓ Student enrollment and status correctly resolved.');

  // Test 3: Graduation Year
  console.log('3. Verifying Graduation Year extraction from resume...');
  const gradField = makeField('Expected Graduation Year', 'gradYear', '', 'number');
  const gradRes = await resolveQuestion(gradField, mockPersona);
  assert.equal(gradRes.answer, '2025', 'Expected graduation year should be extracted from education (2025)');
  console.log('  ✓ Graduation year extracted accurately from student education chunk.');

  // Test 4: GPA Resolution
  console.log('4. Verifying GPA resolution...');
  const gpaField = makeField('What is your current GPA?', 'gpa', '', 'text');
  const gpaRes = await resolveQuestion(gpaField, mockPersona);
  assert.ok(
    parseFloat(gpaRes.answer) >= 3.0,
    `GPA must be a valid positive score, got: ${gpaRes.answer}`
  );
  console.log(`  ✓ GPA resolved cleanly: ${gpaRes.answer}`);

  // Test 5: Applicant Entity Type vs Other
  console.log('5. Verifying entity type selects Independent engineer / consultant...');
  const entityField = makeField(
    'Apply to',
    'applyTo',
    '',
    'radio',
    ['Independent software engineer / consultant', 'Other']
  );
  const entityRes = await resolveQuestion(entityField, mockPersona);
  assert.equal(
    entityRes.answer,
    'Independent software engineer / consultant'
  );
  console.log('  ✓ Entity type resolved accurately.');

  // Test 6: Conditional Licensing Company Name ("N/A")
  console.log('6. Verifying conditional company name is "N/A"...');
  const companyField = makeField(
    'If a comapny, please write the comapny name that will license the code.*'
  );
  const companyRes = await resolveQuestion(companyField, mockPersona);
  assert.equal(companyRes.answer, 'N/A');
  assert.notEqual(
    companyRes.answer,
    mockPersona.fullName,
    'Candidate personal name must NEVER be the company name'
  );
  console.log('  ✓ Conditional company field correctly answers "N/A".');

  // Test 7: Multiline Textarea Summary Fallback speaks in first-person student voice
  console.log('7. Verifying Textarea summary speaks in authentic first-person student voice...');
  const bioField = makeField('About yourself / Bio', 'bio', '', 'textarea');
  const bioRes = await resolveQuestion(bioField, mockPersona);
  assert.ok(
    bioRes.answer.toLowerCase().includes('student') || bioRes.answer.toLowerCase().includes('engineer'),
    'Summary must reflect student/engineering background'
  );
  assert.ok(
    !bioRes.answer.toLowerCase().includes('the candidate is'),
    'Summary must NOT refer to candidate in third person'
  );
  console.log(`  ✓ Summary output verified: "${bioRes.answer.slice(0, 75)}..."`);

  console.log('\n🎉 ALL STUDENT APPLICANT LLM PERSONA & ACCURACY TESTS PASSED!');
}

runStudentPersonaTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
