import React from 'react';
import type { ResumeDocument, ResumeSectionKey } from '../types';
import { DEFAULT_SECTION_ORDER } from '../types';
import { renderFormattedText } from '../documentEditor/markdownParser';

interface TemplateProps {
  document: ResumeDocument;
}

export const ExecutiveMinimal: React.FC<TemplateProps> = ({ document }) => {
  const { contact, summary, experience, education, skills, projects, certifications, customSections, settings } = document;

  const fontClass =
    settings.fontFamily === 'serif'
      ? 'font-serif'
      : settings.fontFamily === 'mono'
      ? 'font-mono'
      : 'font-sans';

  const sectionOrder = settings.sectionOrder || DEFAULT_SECTION_ORDER;

  const renderSection = (key: ResumeSectionKey) => {
    switch (key) {
      case 'summary':
        if (!summary || !summary.trim()) return null;
        return (
          <div key="summary" className="space-y-1">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 border-b border-zinc-300 pb-0.5">
              Core Profile &amp; Value Proposition
            </h2>
            <p className="text-zinc-800 text-justify leading-relaxed">{renderFormattedText(summary)}</p>
          </div>
        );

      case 'experience':
        if (!experience || experience.length === 0) return null;
        return (
          <div key="experience" className="space-y-2">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 border-b border-zinc-300 pb-0.5">
              Executive Leadership &amp; Engineering Experience
            </h2>
            <div className="space-y-3 pt-0.5">
              {experience.map((exp) => (
                <div key={exp.id} className="space-y-1">
                  <div className="flex justify-between items-baseline flex-wrap">
                    <div className="font-bold text-zinc-900">
                      <span className="text-xs">{exp.role}</span>
                      <span className="text-zinc-500 font-normal"> — {exp.company}</span>
                      {exp.location && <span className="text-zinc-400 font-normal text-[10.5px]"> ({exp.location})</span>}
                    </div>
                    <span className="font-mono text-[10px] font-bold text-zinc-600">
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                    </span>
                  </div>
                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul className="list-disc list-outside pl-4 space-y-0.5 text-zinc-800">
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
          <div key="skills" className="space-y-1">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 border-b border-zinc-300 pb-0.5">
              Core Domain &amp; Technical Capabilities
            </h2>
            <div className="text-zinc-800 space-y-0.5 pt-0.5 leading-relaxed">
              {skills.languages?.length > 0 && (
                <div>
                  <span className="font-bold text-zinc-900">Languages: </span>
                  <span>{skills.languages.join(' • ')}</span>
                </div>
              )}
              {skills.backend?.length > 0 && (
                <div>
                  <span className="font-bold text-zinc-900">Backend &amp; Cloud: </span>
                  <span>{skills.backend.concat(skills.cloudDevops || []).join(' • ')}</span>
                </div>
              )}
              {skills.frontend?.length > 0 && (
                <div>
                  <span className="font-bold text-zinc-900">Frontend &amp; UI: </span>
                  <span>{skills.frontend.join(' • ')}</span>
                </div>
              )}
              {skills.databases?.length > 0 && (
                <div>
                  <span className="font-bold text-zinc-900">Databases &amp; Architecture: </span>
                  <span>{skills.databases.concat(skills.tools || []).join(' • ')}</span>
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'projects':
        if (!projects || projects.length === 0) return null;
        return (
          <div key="projects" className="space-y-2">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 border-b border-zinc-300 pb-0.5">
              Strategic Initiatives &amp; Projects
            </h2>
            <div className="space-y-2 pt-0.5">
              {projects.map((proj) => (
                <div key={proj.id} className="space-y-0.5">
                  <div className="flex justify-between items-baseline flex-wrap">
                    <span className="font-bold text-zinc-900">{proj.name}</span>
                    {proj.techStack?.length > 0 && (
                      <span className="text-[10px] text-zinc-500 font-mono">[{proj.techStack.join(', ')}]</span>
                    )}
                  </div>
                  {proj.bullets && proj.bullets.length > 0 && (
                    <ul className="list-disc list-outside pl-4 space-y-0.5 text-zinc-800">
                      {proj.bullets.map((bullet, idx) => (
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

      case 'education':
        if (!education || education.length === 0) return null;
        return (
          <div key="education" className="space-y-1">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 border-b border-zinc-300 pb-0.5">
              Academic Credentials &amp; Education
            </h2>
            <div className="space-y-1 pt-0.5">
              {education.map((edu) => (
                <div key={edu.id} className="flex justify-between items-baseline">
                  <div>
                    <span className="font-bold text-zinc-900">{edu.institution}</span>
                    <span className="text-zinc-600"> — {edu.degree}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-600">{edu.graduationYear}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'certifications':
        if (!certifications || certifications.length === 0) return null;
        return (
          <div key="certifications" className="space-y-1">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 border-b border-zinc-300 pb-0.5">
              Accreditations &amp; Certifications
            </h2>
            <ul className="list-disc list-outside pl-4 space-y-0.5 text-zinc-800">
              {certifications.map((cert) => (
                <li key={cert.id}>
                  <span className="font-semibold text-zinc-900">{cert.name}</span> — {cert.issuer} ({cert.date})
                </li>
              ))}
            </ul>
          </div>
        );

      default: {
        const customSec = customSections?.find((s) => s.id === key);
        if (!customSec || !customSec.items?.length) return null;
        return (
          <div key={customSec.id} className="space-y-1">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 border-b border-zinc-300 pb-0.5">
              {customSec.title}
            </h2>
            <div className="space-y-1.5 pt-0.5">
              {customSec.items.map((item) => (
                <div key={item.id} className="space-y-0.5">
                  <div className="flex justify-between items-baseline flex-wrap">
                    <span className="font-bold text-zinc-900">
                      {item.title}
                      {item.subtitle && <span className="font-normal text-zinc-500 text-[10.5px]"> — {item.subtitle}</span>}
                    </span>
                    {item.date && <span className="text-[10px] font-mono text-zinc-600">{item.date}</span>}
                  </div>
                  {item.description && item.description.trim() && (
                    <p className="text-zinc-800 text-[11px] leading-relaxed pt-0.5">
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
      className={`bg-white text-zinc-900 w-full max-w-[850px] mx-auto p-8 sm:p-10 shadow-lg border border-zinc-200 print:shadow-none print:border-none print:p-0 space-y-4 text-[11.5px] leading-normal ${fontClass}`}
      id="ats-resume-canvas"
    >
      {/* Top Header: Clean Left-Aligned with Right Coordinates */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-zinc-800 pb-3 gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 uppercase font-['Inter']">
            {contact.fullName || 'Candidate Name'}
          </h1>
        </div>
        <div className="text-left sm:text-right text-[10.5px] text-zinc-600 space-y-0.5 font-medium">
          <div>{[contact.location, contact.phone].filter(Boolean).join(' • ')}</div>
          <div>
            <a href={`mailto:${contact.email}`} className="font-semibold text-zinc-900 hover:underline">
              {contact.email}
            </a>
          </div>
          <div className="flex sm:justify-end gap-2 text-zinc-800">
            {contact.linkedIn && (
              <a href={contact.linkedIn.startsWith('http') ? contact.linkedIn : `https://${contact.linkedIn}`} target="_blank" rel="noreferrer" className="hover:underline">
                LinkedIn ↗
              </a>
            )}
            {contact.gitHub && (
              <a href={contact.gitHub.startsWith('http') ? contact.gitHub : `https://${contact.gitHub}`} target="_blank" rel="noreferrer" className="hover:underline">
                GitHub ↗
              </a>
            )}
            {contact.portfolio && (
              <a href={contact.portfolio.startsWith('http') ? contact.portfolio : `https://${contact.portfolio}`} target="_blank" rel="noreferrer" className="hover:underline">
                Portfolio ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Ordered Sections */}
      {sectionOrder.map((secKey) => renderSection(secKey))}
    </div>
  );
};
