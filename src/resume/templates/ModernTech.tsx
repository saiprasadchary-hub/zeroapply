import React from 'react';
import type { ResumeDocument, ResumeSectionKey } from '../types';
import { DEFAULT_SECTION_ORDER } from '../types';
import { Mail, Phone, MapPin, Globe, Code } from 'lucide-react';
import { renderFormattedText } from '../documentEditor/markdownParser';

interface TemplateProps {
  document: ResumeDocument;
}

export const ModernTech: React.FC<TemplateProps> = ({ document }) => {
  const { contact, summary, experience, education, skills, projects, certifications, customSections, settings } = document;

  const fontClass =
    settings.fontFamily === 'serif'
      ? 'font-serif'
      : settings.fontFamily === 'mono'
      ? 'font-mono'
      : 'font-sans';

  const accentColor = settings.accentColor || '#0891b2';
  const sectionOrder = settings.sectionOrder || DEFAULT_SECTION_ORDER;

  const renderSection = (key: ResumeSectionKey) => {
    switch (key) {
      case 'summary':
        if (!summary || !summary.trim()) return null;
        return (
          <div key="summary" className="space-y-1">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: accentColor }} />
              <span>Executive Summary</span>
            </h2>
            <p className="text-zinc-700 text-justify leading-relaxed bg-zinc-50/70 p-2.5 rounded-lg border border-zinc-100">
              {renderFormattedText(summary)}
            </p>
          </div>
        );

      case 'experience':
        if (!experience || experience.length === 0) return null;
        return (
          <div key="experience" className="space-y-2">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5 border-b border-zinc-200 pb-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: accentColor }} />
              <span>Professional Experience</span>
            </h2>
            <div className="space-y-3 pt-1">
              {experience.map((exp) => (
                <div key={exp.id} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-bold text-zinc-900 text-[12.5px]">{exp.role}</span>
                      <span className="text-zinc-400">@</span>
                      <span className="font-semibold" style={{ color: accentColor }}>{exp.company}</span>
                      {exp.location && <span className="text-zinc-500 text-[11px]">({exp.location})</span>}
                    </div>
                    <span className="text-[11px] font-mono text-zinc-600">
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                    </span>
                  </div>
                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul className="list-disc list-outside pl-4 space-y-1 text-zinc-700">
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
            <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5 border-b border-zinc-200 pb-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: accentColor }} />
              <span>Technical Skills</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-700 pt-1">
              {skills.languages?.length > 0 && (
                <div className="bg-zinc-50 p-2 rounded border border-zinc-100">
                  <div className="font-bold text-zinc-900 text-[11px]">Languages</div>
                  <div>{skills.languages.join(', ')}</div>
                </div>
              )}
              {skills.frontend?.length > 0 && (
                <div className="bg-zinc-50 p-2 rounded border border-zinc-100">
                  <div className="font-bold text-zinc-900 text-[11px]">Frontend</div>
                  <div>{skills.frontend.join(', ')}</div>
                </div>
              )}
              {skills.backend?.length > 0 && (
                <div className="bg-zinc-50 p-2 rounded border border-zinc-100">
                  <div className="font-bold text-zinc-900 text-[11px]">Backend &amp; APIs</div>
                  <div>{skills.backend.join(', ')}</div>
                </div>
              )}
              {skills.databases?.length > 0 && (
                <div className="bg-zinc-50 p-2 rounded border border-zinc-100">
                  <div className="font-bold text-zinc-900 text-[11px]">Databases</div>
                  <div>{skills.databases.join(', ')}</div>
                </div>
              )}
              {skills.cloudDevops?.length > 0 && (
                <div className="bg-zinc-50 p-2 rounded border border-zinc-100">
                  <div className="font-bold text-zinc-900 text-[11px]">Cloud &amp; DevOps</div>
                  <div>{skills.cloudDevops.join(', ')}</div>
                </div>
              )}
              {skills.tools?.length > 0 && (
                <div className="bg-zinc-50 p-2 rounded border border-zinc-100">
                  <div className="font-bold text-zinc-900 text-[11px]">Tools</div>
                  <div>{skills.tools.join(', ')}</div>
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
            <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5 border-b border-zinc-200 pb-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: accentColor }} />
              <span>Key Projects</span>
            </h2>
            <div className="space-y-2.5 pt-1">
              {projects.map((proj) => (
                <div key={proj.id} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <div className="font-bold text-zinc-900 text-[12px]">
                      {proj.name}
                      {proj.techStack?.length > 0 && (
                        <span className="font-mono text-[10px] text-zinc-500 font-normal ml-2">
                          [{proj.techStack.join(', ')}]
                        </span>
                      )}
                    </div>
                  </div>
                  {proj.bullets && proj.bullets.length > 0 && (
                    <ul className="list-disc list-outside pl-4 space-y-0.5 text-zinc-700">
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
          <div key="education" className="space-y-1.5">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5 border-b border-zinc-200 pb-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: accentColor }} />
              <span>Education</span>
            </h2>
            <div className="space-y-1 pt-1">
              {education.map((edu) => (
                <div key={edu.id} className="flex items-baseline justify-between gap-2">
                  <div>
                    <span className="font-bold text-zinc-900">{edu.institution}</span>
                    <span className="text-zinc-600"> — {edu.degree}</span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-600">{edu.graduationYear}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'certifications':
        if (!certifications || certifications.length === 0) return null;
        return (
          <div key="certifications" className="space-y-1.5">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5 border-b border-zinc-200 pb-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: accentColor }} />
              <span>Certifications</span>
            </h2>
            <ul className="list-disc list-outside pl-4 space-y-0.5 text-zinc-700">
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
          <div key={customSec.id} className="space-y-2">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5 border-b border-zinc-200 pb-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: accentColor }} />
              <span>{customSec.title}</span>
            </h2>
            <div className="space-y-2 pt-1">
              {customSec.items.map((item) => (
                <div key={item.id} className="space-y-0.5">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <div className="font-bold text-zinc-900">
                      {item.title}
                      {item.subtitle && <span className="font-normal text-zinc-500 text-[11px]"> | {item.subtitle}</span>}
                    </div>
                    {item.date && <span className="text-[11px] font-mono text-zinc-600">{item.date}</span>}
                  </div>
                  {item.description && item.description.trim() && (
                    <p className="text-zinc-700 text-[11.5px] leading-relaxed pt-0.5">
                      {renderFormattedText(item.description)}
                    </p>
                  )}
                  {item.bullets && item.bullets.length > 0 && (
                    <ul className="list-disc list-outside pl-4 space-y-0.5 text-zinc-700">
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
      className={`bg-white text-zinc-900 w-full max-w-[850px] mx-auto p-8 sm:p-10 shadow-lg border border-zinc-200 print:shadow-none print:border-none print:p-0 space-y-4 text-xs leading-normal ${fontClass}`}
      id="ats-resume-canvas"
    >
      {/* Header */}
      <div className="border-b-2 pb-3" style={{ borderColor: accentColor }}>
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
              {contact.fullName || 'Candidate Name'}
            </h1>
          </div>
          {contact.location && (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500">
              <MapPin size={12} className="text-zinc-400" />
              <span>{contact.location}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-600 font-medium pt-2">
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-zinc-900">
              <Mail size={12} style={{ color: accentColor }} />
              <span>{contact.email}</span>
            </a>
          )}
          {contact.phone && (
            <span className="flex items-center gap-1">
              <Phone size={12} style={{ color: accentColor }} />
              <span>{contact.phone}</span>
            </span>
          )}
          {contact.linkedIn && (
            <a href={contact.linkedIn.startsWith('http') ? contact.linkedIn : `https://${contact.linkedIn}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-zinc-900">
              <Globe size={12} style={{ color: accentColor }} />
              <span>{contact.linkedIn.replace(/^https?:\/\/(www\.)?/, '')}</span>
            </a>
          )}
          {contact.gitHub && (
            <a href={contact.gitHub.startsWith('http') ? contact.gitHub : `https://${contact.gitHub}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-zinc-900">
              <Code size={12} style={{ color: accentColor }} />
              <span>{contact.gitHub.replace(/^https?:\/\/(www\.)?/, '')}</span>
            </a>
          )}
          {contact.portfolio && (
            <a href={contact.portfolio.startsWith('http') ? contact.portfolio : `https://${contact.portfolio}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-zinc-900">
              <Globe size={12} style={{ color: accentColor }} />
              <span>{contact.portfolio.replace(/^https?:\/\/(www\.)?/, '')}</span>
            </a>
          )}
        </div>
      </div>

      {/* Dynamic Ordered Sections */}
      {sectionOrder.map((secKey) => renderSection(secKey))}
    </div>
  );
};
