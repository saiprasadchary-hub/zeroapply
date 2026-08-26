import type { ResumeDocument } from '../types';

/**
 * Escapes special LaTeX characters: &, %, $, #, _, {, }, ~, ^, \
 */
function escapeLatex(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

/**
 * Generates an ATS-compliant, compilation-ready LaTeX resume string
 */
export function generateLatexResume(doc: ResumeDocument): string {
  const { contact, summary, experience, education, skills, projects, certifications, customSections } = doc;

  const contactLinks: string[] = [];
  if (contact.email) contactLinks.push(`\\href{mailto:${escapeLatex(contact.email)}}{${escapeLatex(contact.email)}}`);
  if (contact.phone) contactLinks.push(escapeLatex(contact.phone));
  if (contact.location) contactLinks.push(escapeLatex(contact.location));
  if (contact.linkedIn) {
    const raw = contact.linkedIn.replace(/^https?:\/\/(www\.)?/, '');
    contactLinks.push(`\\href{https://${raw}}{${escapeLatex(raw)}}`);
  }
  if (contact.gitHub) {
    const raw = contact.gitHub.replace(/^https?:\/\/(www\.)?/, '');
    contactLinks.push(`\\href{https://${raw}}{${escapeLatex(raw)}}`);
  }
  if (contact.portfolio) {
    const raw = contact.portfolio.replace(/^https?:\/\/(www\.)?/, '');
    contactLinks.push(`\\href{https://${raw}}{${escapeLatex(raw)}}`);
  }

  let tex = `\\documentclass[10pt,letterpaper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{charter}

\\hypersetup{
    colorlinks=true,
    linkcolor=blue,
    urlcolor=blue,
}

\\titleformat{\\section}{\\large\\bfseries\\scshape\\raggedright}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{10pt}{5pt}
\\setlist[itemize]{leftmargin=1.5em, itemsep=2pt, topsep=2pt, parsep=0pt}

\\begin{document}
\\pagestyle{empty}

% ---------- HEADER ----------
\\begin{center}
    {\\huge \\textbf{${escapeLatex(contact.fullName || 'YOUR NAME')}}} \\\\[4pt]
    ${contact.jobTitle ? `{\\large \\textit{${escapeLatex(contact.jobTitle)}}} \\\\[4pt]` : ''}
    ${contactLinks.join(' $|$ ')}
\\end{center}
`;

  // Summary
  if (summary && summary.trim()) {
    tex += `
\\section*{Professional Summary}
${escapeLatex(summary.trim())}
`;
  }

  // Work Experience
  if (experience && experience.length > 0) {
    tex += `
\\section*{Work Experience}
`;
    experience.forEach((exp) => {
      const dates = `${escapeLatex(exp.startDate || '')} -- ${exp.current ? 'Present' : escapeLatex(exp.endDate || '')}`;
      tex += `\\noindent\\textbf{${escapeLatex(exp.role || 'Role')}} \\hfill ${dates} \\\\
\\textit{${escapeLatex(exp.company || '')}${exp.location ? `, ${escapeLatex(exp.location)}` : ''}}
\\begin{itemize}
`;
      exp.bullets.forEach((b) => {
        if (b.trim()) {
          tex += `    \\item ${escapeLatex(b.trim())}\n`;
        }
      });
      tex += `\\end{itemize}
\\vspace{4pt}
`;
    });
  }

  // Technical Skills
  const skillCategories = [
    { label: 'Languages', items: skills.languages },
    { label: 'Frontend', items: skills.frontend },
    { label: 'Backend \\& APIs', items: skills.backend },
    { label: 'Databases', items: skills.databases },
    { label: 'Cloud \\& DevOps', items: skills.cloudDevops },
    { label: 'Tools \\& Architecture', items: skills.tools },
    { label: 'Core Competencies', items: skills.custom },
  ].filter((c) => c.items && c.items.length > 0);

  if (skillCategories.length > 0) {
    tex += `
\\section*{Technical Skills}
\\begin{itemize}
`;
    skillCategories.forEach((cat) => {
      tex += `    \\item \\textbf{${cat.label}:} ${cat.items.map(escapeLatex).join(', ')}\n`;
    });
    tex += `\\end{itemize}
`;
  }

  // Projects
  if (projects && projects.length > 0) {
    tex += `
\\section*{Featured Projects}
`;
    projects.forEach((proj) => {
      const tech = proj.techStack?.length ? ` (${proj.techStack.map(escapeLatex).join(', ')})` : '';
      tex += `\\noindent\\textbf{${escapeLatex(proj.name || 'Project')}}${tech} \\\\
`;
      if (proj.url || proj.gitHub) {
        const links = [proj.url, proj.gitHub].filter(Boolean).map(l => `\\url{${escapeLatex(l!)}}`).join(' $|$ ');
        tex += `\\textit{${links}} \\\\
`;
      }
      tex += `\\begin{itemize}
`;
      proj.bullets.forEach((b) => {
        if (b.trim()) {
          tex += `    \\item ${escapeLatex(b.trim())}\n`;
        }
      });
      tex += `\\end{itemize}
\\vspace{4pt}
`;
    });
  }

  // Education
  if (education && education.length > 0) {
    tex += `
\\section*{Education}
`;
    education.forEach((edu) => {
      tex += `\\noindent\\textbf{${escapeLatex(edu.institution || 'University')}} \\hfill ${escapeLatex(edu.graduationYear || '')} \\\\
\\textit{${escapeLatex(edu.degree || '')}${edu.location ? `, ${escapeLatex(edu.location)}` : ''}}
\\vspace{4pt}
`;
    });
  }

  // Certifications
  if (certifications && certifications.length > 0) {
    tex += `
\\section*{Certifications}
\\begin{itemize}
`;
    certifications.forEach((cert) => {
      tex += `    \\item \\textbf{${escapeLatex(cert.name)}} -- ${escapeLatex(cert.issuer)} (${escapeLatex(cert.date)})\n`;
    });
    tex += `\\end{itemize}
`;
  }

  // Custom Sections
  if (customSections && customSections.length > 0) {
    customSections.forEach((sec) => {
      if (sec.title && sec.items?.length > 0) {
        tex += `
\\section*{${escapeLatex(sec.title)}}
`;
        sec.items.forEach((item) => {
          tex += `\\noindent\\textbf{${escapeLatex(item.title)}} ${item.date ? `\\hfill ${escapeLatex(item.date)}` : ''} \\\\
`;
          if (item.subtitle || item.location) {
            tex += `\\textit{${[item.subtitle, item.location].filter(Boolean).map(s => escapeLatex(s!)).join(', ')}} \\\\
`;
          }
          if (item.description && item.description.trim()) {
            tex += `${escapeLatex(item.description.trim())} \\\\
`;
          }
          if (item.bullets && item.bullets.length > 0) {
            tex += `\\begin{itemize}
`;
            item.bullets.forEach((b) => {
              if (b.trim()) tex += `    \\item ${escapeLatex(b.trim())}\n`;
            });
            tex += `\\end{itemize}
`;
          }
          tex += `\\vspace{4pt}
`;
        });
      }
    });
  }

  tex += `
\\end{document}
`;

  return tex;
}

/**
 * Initiates direct browser download of the LaTeX .tex file
 */
export function exportResumeToLatex(doc: ResumeDocument) {
  const texContent = generateLatexResume(doc);
  const title = (doc.contact.fullName || 'Resume').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${title}_ATS_Resume.tex`;

  const blob = new Blob([texContent], { type: 'text/x-tex;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
