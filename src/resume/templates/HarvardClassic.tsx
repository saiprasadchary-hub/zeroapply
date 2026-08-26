import React from 'react';
import type { ResumeDocument, ResumeSectionKey } from '../types';
import { DEFAULT_SECTION_ORDER } from '../types';
import { renderFormattedText } from '../documentEditor/markdownParser';

interface TemplateProps {
  document: ResumeDocument;
}

export const HarvardClassic: React.FC<TemplateProps> = ({ document }) => {
  const { contact, summary, experience, education, skills, projects, certifications, customSections, settings } = document;

  const fontClass =
    settings.fontFamily === 'serif'
      ? 'font-serif'
      : settings.fontFamily === 'mono'
      ? 'font-mono'
      : 'font-sans';

  const spacingClass =
    settings.fontSize === 'compact'
      ? 'text-[11px] leading-snug space-y-3'
      : settings.fontSize === 'spacious'
      ? 'text-[13px] leading-relaxed space-y-5'
      : 'text-[12px] leading-normal space-y-4';

  const sectionOrder = settings.sectionOrder || DEFAULT_SECTION_ORDER;

  const renderSection = (key: ResumeSectionKey) => {
    switch (key) {
      case 'summary':
        if (!summary || !summary.trim()) return null;
        return (
          <div key="summary" className="space-y-1">
            <h2 className="text-xs font-bold uppercase tracking-wider border-b border-zinc-400 pb-0.5 text-zinc-900">
              Professional Summary
            </h2>
            <p className="text-zinc-800 text-justify leading-relaxed">{renderFormattedText(summary)}</p>
          </div>
        );

      case 'experience':
        if (!experience || experience.length === 0) return null;
        return (
          <div key="experience" className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider border-b border-zinc-400 pb-0.5 text-zinc-900">
              Work Experience
            </h2>
            <div className="space-y-3">
              {experience.map((exp) => (
                <div key={exp.id} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <div>
                      <span className="font-bold text-zinc-900">{exp.company}</span>
                      {exp.location && <span className="text-zinc-600 font-normal">, {exp.location}</span>}
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-700">
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                    </span>
                  </div>
                  <div className="italic text-zinc-800 text-[11.5px] font-medium">{exp.role}</div>
                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul className="list-disc list-outside pl-4 space-y-1 text-zinc-800">
                      {exp.bullets.map((bullet, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {renderFormattedText(bullet)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'skills': {
        const hasAnySkills = Boolean(
          skills && (
            (skills.languages && skills.languages.length > 0) ||
            (skills.frontend && skills.frontend.length > 0) ||
            (skills.backend && skills.backend.length > 0) ||
            (skills.databases && skills.databases.length > 0) ||
            (skills.cloudDevops && skills.cloudDevops.length > 0) ||
            (skills.tools && skills.tools.length > 0) ||
            (skills.custom && skills.custom.length > 0)
          )
        );
        if (!hasAnySkills) return null;
        return (
          <div key="skills" className="space-y-1.5">
            <h2 className="text-xs font-bold uppercase tracking-wider border-b border-zinc-400 pb-0.5 text-zinc-900">
              Technical Skills &amp; Competencies
            </h2>
            <div className="space-y-0.5 text-zinc-800">
              {skills.languages?.length > 0 && (
                <div>
                  <span className="font-bold">Programming Languages: </span>
                  <span>{skills.languages.join(', ')}</span>
                </div>
              )}
              {skills.frontend?.length > 0 && (
                <div>
                  <span className="font-bold">Frontend Technologies: </span>
                  <span>{skills.frontend.join(', ')}</span>
                </div>
              )}
              {skills.backend?.length > 0 && (
                <div>
                  <span className="font-bold">Backend &amp; APIs: </span>
                  <span>{skills.backend.join(', ')}</span>
                </div>
              )}
              {skills.databases?.length > 0 && (
                <div>
                  <span className="font-bold">Databases &amp; Storage: </span>
                  <span>{skills.databases.join(', ')}</span>
                </div>
              )}
              {skills.cloudDevops?.length > 0 && (
                <div>
                  <span className="font-bold">Cloud &amp; DevOps: </span>
                  <span>{skills.cloudDevops.join(', ')}</span>
                </div>
              )}
              {skills.tools?.length > 0 && (
                <div>
                  <span className="font-bold">Tools &amp; Methodologies: </span>
                  <span>{skills.tools.join(', ')}</span>
                </div>
              )}
              {skills.custom?.length > 0 && (
                <div>
                  <span className="font-bold">Core Competencies: </span>
                  <span>{skills.custom.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'projects':
        if (!projects || projects.length === 0) return null;
        return (
          <div key="projects" className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider border-b border-zinc-400 pb-0.5 text-zinc-900">
              Featured Projects
            </h2>
            <div className="space-y-2">
              {projects.map((proj) => (
                <div key={proj.id} className="space-y-0.5">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <div className="font-bold text-zinc-900">
                      {proj.name}
                      {proj.techStack?.length > 0 && (
                        <span className="font-normal text-zinc-600 text-[11px]">
                          {' '}| {proj.techStack.join(', ')}
                        </span>
                      )}
                    </div>
                    {(proj.url || proj.gitHub) && (
                      <span className="text-[11px] text-zinc-600">
                        {[proj.url, proj.gitHub].filter(Boolean).map((link) => (
                          <a key={link} href={link?.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noreferrer" className="hover:underline ml-2 text-zinc-800">
                            {link?.replace(/^https?:\/\/(www\.)?/, '')}
                          </a>
                        ))}
                      </span>
                    )}
                  </div>
                  {proj.bullets && proj.bullets.length > 0 && (
                    <ul className="list-disc list-outside pl-4 space-y-0.5 text-zinc-800">
                      {proj.bullets.map((bullet, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'education':
        if (!education || education.length === 0) return null;
        return (
          <div key="education" className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider border-b border-zinc-400 pb-0.5 text-zinc-900">
              Education
            </h2>
            <div className="space-y-1.5">
              {education.map((edu) => (
                <div key={edu.id} className="space-y-0.5">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <div className="font-bold text-zinc-900">
                      {edu.institution}
                      {edu.location && <span className="font-normal text-zinc-600">, {edu.location}</span>}
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-700">{edu.graduationYear}</span>
                  </div>
                  <div className="text-zinc-800 flex items-center justify-between">
                    <span>{edu.degree}</span>
                    {(edu.gpa || edu.honors) && (
                      <span className="text-[11px] italic text-zinc-600">
                        {[edu.honors, edu.gpa ? `GPA: ${edu.gpa}` : ''].filter(Boolean).join(' • ')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'certifications':
        if (!certifications || certifications.length === 0) return null;
        return (
          <div key="certifications" className="space-y-1.5">
            <h2 className="text-xs font-bold uppercase tracking-wider border-b border-zinc-400 pb-0.5 text-zinc-900">
              Certifications &amp; Credentials
            </h2>
            <ul className="list-disc list-outside pl-4 space-y-0.5 text-zinc-800">
              {certifications.map((cert) => (
                <li key={cert.id}>
                  <span className="font-semibold">{cert.name}</span> — <span>{cert.issuer}</span> ({cert.date})
                </li>
              ))}
            </ul>
          </div>
        );

      default: {
        // Custom section handler
        const customSec = customSections?.find((s) => s.id === key);
        if (!customSec || !customSec.items?.length) return null;
        return (
          <div key={customSec.id} className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider border-b border-zinc-400 pb-0.5 text-zinc-900">
              {customSec.title}
            </h2>
            <div className="space-y-2">
              {customSec.items.map((item) => (
                <div key={item.id} className="space-y-0.5">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <div className="font-bold text-zinc-900">
                      {item.title}
                      {item.subtitle && <span className="font-normal text-zinc-600 text-[11px]"> | {item.subtitle}</span>}
                    </div>
                    {item.date && <span className="text-[11px] font-semibold text-zinc-700">{item.date}</span>}
                  </div>
                  {item.description && item.description.trim() && (
                    <p className="text-zinc-800 text-[11.5px] leading-relaxed pt-0.5">
                      {renderFormattedText(item.description)}
                    </p>
                  )}
                  {item.bullets && item.bullets.length > 0 && (
                    <ul className="list-disc list-outside pl-4 space-y-0.5 text-zinc-800">
                      {item.bullets.map((bullet, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {renderFormattedText(bullet)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div
      className={`bg-white text-zinc-900 w-full max-w-[850px] mx-auto p-8 sm:p-10 shadow-lg border border-zinc-200 print:shadow-none print:border-none print:p-0 ${fontClass} ${spacingClass}`}
      id="ats-resume-canvas"
    >
      {/* Header / Contact Block */}
      <div className="text-center space-y-1 pb-2 border-b border-zinc-900">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase">
          {contact.fullName || 'Candidate Name'}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 text-[11px] text-zinc-700 pt-0.5">
          {contact.location && <span>{contact.location}</span>}
          {contact.email && (
            <>
              <span>•</span>
              <a href={`mailto:${contact.email}`} className="hover:underline text-zinc-900 font-medium">
                {contact.email}
              </a>
            </>
          )}
          {contact.phone && (
            <>
              <span>•</span>
              <span>{contact.phone}</span>
            </>
          )}
          {contact.linkedIn && (
            <>
              <span>•</span>
              <a href={contact.linkedIn.startsWith('http') ? contact.linkedIn : `https://${contact.linkedIn}`} target="_blank" rel="noreferrer" className="hover:underline text-zinc-900">
                {contact.linkedIn.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            </>
          )}
          {contact.gitHub && (
            <>
              <span>•</span>
              <a href={contact.gitHub.startsWith('http') ? contact.gitHub : `https://${contact.gitHub}`} target="_blank" rel="noreferrer" className="hover:underline text-zinc-900">
                {contact.gitHub.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            </>
          )}
          {contact.portfolio && (
            <>
              <span>•</span>
              <a href={contact.portfolio.startsWith('http') ? contact.portfolio : `https://${contact.portfolio}`} target="_blank" rel="noreferrer" className="hover:underline text-zinc-900">
                {contact.portfolio.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            </>
          )}
        </div>
      </div>

      {/* Dynamic Ordered Sections */}
      {sectionOrder.map((secKey) => renderSection(secKey))}
    </div>
  );
};
