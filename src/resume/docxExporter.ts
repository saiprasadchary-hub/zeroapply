import type { ResumeDocument } from './types';

/**
 * Generates and downloads a clean, ATS-compliant Microsoft Word (.docx / XML) document
 */
export function exportResumeToDocx(doc: ResumeDocument) {
  const title = (doc.contact.fullName || 'Resume').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${title}_ATS_Resume.doc`;

  const htmlContent = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${doc.contact.fullName || 'Resume'}</title>
  <style>
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.35;
      color: #111111;
      margin: 1in;
    }
    h1 {
      font-size: 18pt;
      text-transform: uppercase;
      margin: 0;
      text-align: center;
      font-weight: bold;
    }
    .contact-header {
      text-align: center;
      font-size: 9.5pt;
      color: #333333;
      margin-top: 4pt;
      margin-bottom: 12pt;
      border-bottom: 1.5pt solid #111111;
      padding-bottom: 6pt;
    }
    .job-title {
      text-align: center;
      font-size: 12pt;
      font-weight: bold;
      color: #222222;
      margin-top: 2pt;
    }
    h2 {
      font-size: 11pt;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      border-bottom: 1pt solid #444444;
      padding-bottom: 2pt;
      margin-top: 10pt;
      margin-bottom: 4pt;
      font-weight: bold;
      color: #111111;
    }
    .role-header {
      font-weight: bold;
      font-size: 10.5pt;
      margin-top: 6pt;
      margin-bottom: 2pt;
    }
    .role-dates {
      float: right;
      font-weight: normal;
      font-size: 9.5pt;
      color: #444444;
    }
    ul {
      margin-top: 2pt;
      margin-bottom: 6pt;
      padding-left: 18pt;
    }
    li {
      margin-bottom: 2pt;
      font-size: 10pt;
      text-align: justify;
    }
    .skills-category {
      font-weight: bold;
      color: #111111;
    }
  </style>
</head>
<body>
  <h1>${doc.contact.fullName || 'YOUR NAME'}</h1>
  ${doc.contact.jobTitle ? `<div class="job-title">${doc.contact.jobTitle}</div>` : ''}
  
  <div class="contact-header">
    ${[
      doc.contact.location,
      doc.contact.email,
      doc.contact.phone,
      doc.contact.linkedIn,
      doc.contact.gitHub,
    ]
      .filter(Boolean)
      .join(' &nbsp;•&nbsp; ')}
  </div>

  ${
    doc.summary
      ? `
  <h2>Professional Summary</h2>
  <p style="font-size: 10pt; margin-top: 3pt; text-align: justify;">${doc.summary}</p>
  `
      : ''
  }

  ${
    doc.experience.length > 0
      ? `
  <h2>Work Experience</h2>
  ${doc.experience
    .map(
      (exp) => `
    <div class="role-header">
      <span>${exp.role || 'Role'}</span>${exp.company ? ` &mdash; ${exp.company}` : ''}${exp.location ? `, ${exp.location}` : ''}
      <span class="role-dates">${exp.startDate || ''} &ndash; ${exp.current ? 'Present' : exp.endDate || ''}</span>
    </div>
    <ul>
      ${exp.bullets.map((b) => (b.trim() ? `<li>${b}</li>` : '')).join('')}
    </ul>
  `
    )
    .join('')}
  `
      : ''
  }

  <h2>Technical Skills</h2>
  <div style="font-size: 10pt; line-height: 1.4;">
    ${doc.skills.languages?.length ? `<p><span class="skills-category">Languages:</span> ${doc.skills.languages.join(', ')}</p>` : ''}
    ${doc.skills.frontend?.length ? `<p><span class="skills-category">Frontend:</span> ${doc.skills.frontend.join(', ')}</p>` : ''}
    ${doc.skills.backend?.length ? `<p><span class="skills-category">Backend & APIs:</span> ${doc.skills.backend.join(', ')}</p>` : ''}
    ${doc.skills.databases?.length ? `<p><span class="skills-category">Databases:</span> ${doc.skills.databases.join(', ')}</p>` : ''}
    ${doc.skills.cloudDevops?.length ? `<p><span class="skills-category">Cloud & DevOps:</span> ${doc.skills.cloudDevops.join(', ')}</p>` : ''}
    ${doc.skills.tools?.length ? `<p><span class="skills-category">Tools & Architecture:</span> ${doc.skills.tools.join(', ')}</p>` : ''}
  </div>

  ${
    doc.projects.length > 0
      ? `
  <h2>Featured Projects</h2>
  ${doc.projects
    .map(
      (proj) => `
    <div class="role-header">
      <span>${proj.name || 'Project'}</span>
      ${proj.techStack?.length ? `<span class="role-dates">(${proj.techStack.join(', ')})</span>` : ''}
    </div>
    <ul>
      ${proj.bullets.map((b) => (b.trim() ? `<li>${b}</li>` : '')).join('')}
    </ul>
  `
    )
    .join('')}
  `
      : ''
  }

  ${
    doc.education.length > 0
      ? `
  <h2>Education & Credentials</h2>
  ${doc.education
    .map(
      (edu) => `
    <div class="role-header">
      <span>${edu.institution || 'University'}</span>${edu.degree ? ` &mdash; ${edu.degree}` : ''}
      <span class="role-dates">${edu.graduationYear || ''}</span>
    </div>
  `
    )
    .join('')}
  `
      : ''
  }

  ${
    doc.certifications?.length > 0
      ? `
  <h2>Certifications</h2>
  <ul>
    ${doc.certifications.map((c) => `<li><strong>${c.name}</strong> &mdash; ${c.issuer} (${c.date})</li>`).join('')}
  </ul>
  `
      : ''
  }

  ${
    doc.customSections?.length
      ? doc.customSections
          .filter((s) => s.title && s.items?.length > 0)
          .map(
            (sec) => `
  <h2>${sec.title}</h2>
  ${sec.items
    .map(
      (item) => `
    <div class="role-header">
      <span>${item.title}</span>${item.subtitle ? ` &mdash; ${item.subtitle}` : ''}${item.location ? `, ${item.location}` : ''}
      ${item.date ? `<span class="role-dates">${item.date}</span>` : ''}
    </div>
    ${
      item.description?.trim()
        ? `<p style="margin-top:2pt;margin-bottom:3pt;">${item.description.trim()}</p>`
        : ''
    }
    ${
      item.bullets?.length
        ? `<ul>${item.bullets.map((b) => (b.trim() ? `<li>${b}</li>` : '')).join('')}</ul>`
        : ''
    }
  `
    )
    .join('')}
  `
          )
          .join('')
      : ''
  }

</body>
</html>
  `;

  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
