import { useState, useRef, useEffect, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════ */
const ROLES = ["Software Developer","Frontend Developer","Backend Developer","Full Stack Developer","Data Scientist","ML Engineer","DevOps Engineer","Product Manager","UI/UX Designer","Cybersecurity Analyst","Marketing Specialist","Business Analyst","Sales Executive","HR Manager","Financial Analyst"];
const COMPANY_TYPES = [
  { id:"product", label:"Product-Based", desc:"FAANG · SaaS · Startups", icon:"🚀" },
  { id:"service", label:"Service-Based", desc:"TCS · Infosys · Wipro", icon:"🏢" },
  { id:"startup", label:"Early Startup", desc:"Seed · Series A/B", icon:"⚡" },
  { id:"mnc", label:"MNC / Consulting", desc:"Deloitte · McKinsey · IBM", icon:"🌐" },
];
const EXP_LEVELS = [
  { id:"fresher", label:"Fresher", desc:"No experience" },
  { id:"junior", label:"Junior", desc:"0–2 yrs" },
  { id:"mid", label:"Mid-level", desc:"2–5 yrs" },
  { id:"senior", label:"Senior", desc:"5+ yrs" },
];

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════════ */
const T = {
  bg:"#F5F6FA", surface:"#FFFFFF", border:"#E3E7EF", borderHover:"#B8C0D0",
  text:"#16192A", sub:"#4B5268", muted:"#8891AA", faint:"#F0F2F7",
  blue:"#2B5CE6", blueMid:"#EEF3FD", blueLight:"#F4F7FF",
  green:"#12A150", greenLight:"#EDF8F2", red:"#D63B3B", redLight:"#FEF2F2",
  amber:"#C97A0A", amberLight:"#FFFBEB", purple:"#6D3BE8", purpleLight:"#F3EFFE",
  github:"#24292F", githubLight:"#F6F8FA",
};

/* ═══════════════════════════════════════════════════════════
   AUTH STORE
═══════════════════════════════════════════════════════════ */
const authStore = {
  users: [{ username:"demo", password:"demo123", name:"Demo User" }],
  find: (u) => authStore.users.find(x => x.username.toLowerCase() === u.toLowerCase()),
  add: (username, password, name) => authStore.users.push({ username, password, name }),
};

/* ═══════════════════════════════════════════════════════════
   RESUME PARSER
═══════════════════════════════════════════════════════════ */
function parseResumeText(text) {
  if (!text) return {};
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const sectionHeaders = /^(CONTACT|SUMMARY|OBJECTIVE|SKILLS?|EXPERIENCE|WORK EXPERIENCE|EDUCATION|PROJECTS?|CERTIFICATIONS?|ACHIEVEMENTS?|AWARDS?|LANGUAGES?|INTERESTS?|REFERENCES?|PUBLICATIONS?|VOLUNTEER)/i;

  const sections = {};
  let currentKey = "header";
  sections[currentKey] = [];

  for (const line of lines) {
    if (sectionHeaders.test(line)) {
      currentKey = line.toUpperCase().replace(/[^A-Z\s]/g,"").trim().split(/\s+/)[0];
      sections[currentKey] = [];
    } else {
      sections[currentKey] = [...(sections[currentKey]||[]), line];
    }
  }

  const headerLines = sections.header || [];
  const name = headerLines[0] || "";
  const contactLine = headerLines.slice(1).join(" | ");

  const allText = text;
  const emailMatch = allText.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  const phoneMatch = allText.match(/[\+]?[\d\s\-().]{8,16}/);
  const linkedinMatch = allText.match(/linkedin\.com\/in\/[\w-]+/i);
  const githubMatch = allText.match(/github\.com\/[\w-]+/i);

  return {
    name,
    contact: contactLine,
    email: emailMatch?.[0] || "",
    phone: phoneMatch?.[0]?.trim() || "",
    linkedin: linkedinMatch?.[0] || "",
    github: githubMatch?.[0] || "",
    summary: (sections.SUMMARY || sections.OBJECTIVE || []).join(" "),
    skills: sections.SKILL || sections.SKILLS || [],
    experience: sections.EXPERIENCE || sections["WORK"] || [],
    education: sections.EDUCATION || [],
    projects: sections.PROJECT || sections.PROJECTS || [],
    certifications: sections.CERTIFICATION || sections.CERTIFICATIONS || [],
    raw: sections,
  };
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE DEFINITIONS
═══════════════════════════════════════════════════════════ */
const TEMPLATES = [
  {
    id: "atlas",
    name: "Atlas",
    tag: "Modern · Two-column",
    desc: "Bold sidebar layout with accent color. Best for tech & product roles.",
    roles: ["Software Developer","Frontend Developer","Backend Developer","Full Stack Developer","ML Engineer","DevOps Engineer","Data Scientist"],
    accentDefault: "#2B5CE6",
    preview: "sidebar",
  },
  {
    id: "meridian",
    name: "Meridian",
    tag: "Executive · Minimal",
    desc: "Clean single-column, strong typography. Best for management & consulting.",
    roles: ["Product Manager","Business Analyst","Financial Analyst","HR Manager","Sales Executive","MNC / Consulting"],
    accentDefault: "#16192A",
    preview: "executive",
  },
  {
    id: "nova",
    name: "Nova",
    tag: "Creative · Accent-led",
    desc: "Vibrant header band, clean body. Best for design, marketing & startups.",
    roles: ["UI/UX Designer","Marketing Specialist","Cybersecurity Analyst","Early Startup"],
    accentDefault: "#6D3BE8",
    preview: "creative",
  },
];

function pickTemplate(detectedRole, companyType) {
  for (const t of TEMPLATES) {
    if (t.roles.some(r => detectedRole?.toLowerCase().includes(r.toLowerCase()) || r === companyType)) return t;
  }
  return TEMPLATES[0];
}

/* ═══════════════════════════════════════════════════════════
   RESUME TEMPLATE: ATLAS
═══════════════════════════════════════════════════════════ */
function TemplateAtlas({ parsed, accent = "#2B5CE6" }) {
  const skillList = parsed.skills.join(" ").split(/[,•·|;\n]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 40).slice(0, 20);
  const expLines = [...(parsed.experience || []), ...(parsed.projects || [])];
  const eduLines = parsed.education || [];
  const certLines = parsed.certifications || [];

  return (
    <div style={{ fontFamily: "'Georgia', 'Times New Roman', serif", display: "flex", width: "100%", minHeight: 1056, background: "#fff", fontSize: 11, lineHeight: 1.55, color: "#1a1a2e" }}>
      <div style={{ width: 220, background: accent, color: "#fff", padding: "32px 20px", flexShrink: 0, boxSizing: "border-box" }}>
        <div style={{ fontFamily: "'Arial Black', sans-serif", fontSize: 18, fontWeight: 900, lineHeight: 1.2, marginBottom: 4, wordBreak: "break-word", letterSpacing: -0.3 }}>{parsed.name || "Your Name"}</div>
        <div style={{ fontSize: 9.5, opacity: 0.82, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.25)", paddingBottom: 16 }}>Resume</div>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1.2, opacity: 0.7, marginBottom: 8, fontFamily: "sans-serif", fontWeight: 700 }}>Contact</div>
        {parsed.email && <div style={{ fontSize: 9.5, marginBottom: 5, wordBreak: "break-all", opacity: 0.9 }}>✉ {parsed.email}</div>}
        {parsed.phone && <div style={{ fontSize: 9.5, marginBottom: 5, opacity: 0.9 }}>☎ {parsed.phone}</div>}
        {parsed.linkedin && <div style={{ fontSize: 9.5, marginBottom: 5, wordBreak: "break-all", opacity: 0.9 }}>in {parsed.linkedin}</div>}
        {parsed.github && <div style={{ fontSize: 9.5, marginBottom: 14, wordBreak: "break-all", opacity: 0.9 }}>⊞ {parsed.github}</div>}
        {skillList.length > 0 && <>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1.2, opacity: 0.7, marginBottom: 8, fontFamily: "sans-serif", fontWeight: 700, marginTop: 10 }}>Skills</div>
          {skillList.map((s, i) => (
            <div key={i} style={{ marginBottom: 5 }}>
              <div style={{ fontSize: 9.5, opacity: 0.95, marginBottom: 2 }}>{s}</div>
              <div style={{ height: 3, background: "rgba(255,255,255,0.2)", borderRadius: 99 }}>
                <div style={{ width: `${70 + (i % 4) * 8}%`, height: "100%", background: "rgba(255,255,255,0.75)", borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </>}
        {certLines.length > 0 && <>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1.2, opacity: 0.7, marginBottom: 8, fontFamily: "sans-serif", fontWeight: 700, marginTop: 16 }}>Certifications</div>
          {certLines.map((c, i) => <div key={i} style={{ fontSize: 9.5, opacity: 0.9, marginBottom: 4 }}>• {c}</div>)}
        </>}
      </div>
      <div style={{ flex: 1, padding: "32px 28px", boxSizing: "border-box" }}>
        {parsed.summary && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 10.5, fontFamily: "sans-serif", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 4, marginBottom: 8 }}>Profile</div>
            <p style={{ margin: 0, fontSize: 10.5, color: "#333", lineHeight: 1.7 }}>{parsed.summary}</p>
          </div>
        )}
        {expLines.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 10.5, fontFamily: "sans-serif", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 4, marginBottom: 10 }}>Experience & Projects</div>
            {expLines.map((line, i) => {
              const isBullet = line.startsWith("-") || line.startsWith("•");
              return isBullet
                ? <div key={i} style={{ fontSize: 10, color: "#444", paddingLeft: 14, marginBottom: 3, position: "relative" }}><span style={{ position: "absolute", left: 4 }}>▸</span>{line.replace(/^[-•]\s*/, "")}</div>
                : <div key={i} style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 10.5, color: "#1a1a2e", marginTop: i > 0 ? 10 : 0, marginBottom: 3 }}>{line}</div>;
            })}
          </div>
        )}
        {eduLines.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 10.5, fontFamily: "sans-serif", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 4, marginBottom: 10 }}>Education</div>
            {eduLines.map((line, i) => {
              const isBullet = line.startsWith("-") || line.startsWith("•");
              return isBullet
                ? <div key={i} style={{ fontSize: 10, color: "#444", paddingLeft: 14, marginBottom: 3 }}>{line.replace(/^[-•]\s*/, "")}</div>
                : <div key={i} style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 10.5, color: "#1a1a2e", marginTop: i > 0 ? 8 : 0, marginBottom: 2 }}>{line}</div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RESUME TEMPLATE: MERIDIAN
═══════════════════════════════════════════════════════════ */
function TemplateMeridian({ parsed, accent = "#16192A" }) {
  const skillList = parsed.skills.join(" ").split(/[,•·|;\n]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 40).slice(0, 18);
  const expLines = parsed.experience || [];
  const projLines = parsed.projects || [];
  const eduLines = parsed.education || [];
  const certLines = parsed.certifications || [];

  const SectionTitle = ({ children }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, marginTop: 18 }}>
      <div style={{ width: 3, height: 16, background: accent, borderRadius: 2 }} />
      <div style={{ fontSize: 9.5, fontFamily: "sans-serif", fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: accent }}>{children}</div>
      <div style={{ flex: 1, height: 1, background: "#e0e0e0" }} />
    </div>
  );

  return (
    <div style={{ fontFamily: "'Georgia', serif", width: "100%", minHeight: 1056, background: "#fff", padding: "44px 52px", boxSizing: "border-box", fontSize: 11, lineHeight: 1.6, color: "#1a1a2e" }}>
      <div style={{ borderBottom: `3px solid ${accent}`, paddingBottom: 16, marginBottom: 6 }}>
        <div style={{ fontFamily: "sans-serif", fontWeight: 900, fontSize: 26, letterSpacing: -0.5, color: accent, lineHeight: 1.1, marginBottom: 5 }}>{parsed.name || "Your Name"}</div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 9.5, color: "#555", fontFamily: "sans-serif" }}>
          {parsed.email && <span>✉ {parsed.email}</span>}
          {parsed.phone && <span>☎ {parsed.phone}</span>}
          {parsed.linkedin && <span>in {parsed.linkedin}</span>}
          {parsed.github && <span>⊞ {parsed.github}</span>}
        </div>
      </div>
      {parsed.summary && <>
        <SectionTitle>Executive Summary</SectionTitle>
        <p style={{ margin: 0, fontSize: 10.5, lineHeight: 1.75, color: "#333" }}>{parsed.summary}</p>
      </>}
      {expLines.length > 0 && <>
        <SectionTitle>Professional Experience</SectionTitle>
        {expLines.map((line, i) => {
          const isBullet = line.startsWith("-") || line.startsWith("•");
          return isBullet
            ? <div key={i} style={{ fontSize: 10.5, color: "#444", paddingLeft: 16, marginBottom: 3, position: "relative" }}><span style={{ position: "absolute", left: 5, color: accent }}>›</span>{line.replace(/^[-•]\s*/, "")}</div>
            : <div key={i} style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 11, color: "#1a1a2e", marginTop: i > 0 ? 10 : 0, marginBottom: 3 }}>{line}</div>;
        })}
      </>}
      {projLines.length > 0 && <>
        <SectionTitle>Key Projects</SectionTitle>
        {projLines.map((line, i) => {
          const isBullet = line.startsWith("-") || line.startsWith("•");
          return isBullet
            ? <div key={i} style={{ fontSize: 10.5, color: "#444", paddingLeft: 16, marginBottom: 3, position: "relative" }}><span style={{ position: "absolute", left: 5, color: accent }}>›</span>{line.replace(/^[-•]\s*/, "")}</div>
            : <div key={i} style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 11, color: "#1a1a2e", marginTop: i > 0 ? 10 : 0, marginBottom: 3 }}>{line}</div>;
        })}
      </>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginTop: 4 }}>
        <div>
          {eduLines.length > 0 && <>
            <SectionTitle>Education</SectionTitle>
            {eduLines.map((line, i) => {
              const isBullet = line.startsWith("-") || line.startsWith("•");
              return isBullet
                ? <div key={i} style={{ fontSize: 10, color: "#555", paddingLeft: 12, marginBottom: 3 }}>{line.replace(/^[-•]\s*/, "")}</div>
                : <div key={i} style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 10.5, color: "#1a1a2e", marginTop: i > 0 ? 8 : 0, marginBottom: 2 }}>{line}</div>;
            })}
          </>}
        </div>
        <div>
          {skillList.length > 0 && <>
            <SectionTitle>Core Skills</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {skillList.map((s, i) => (
                <span key={i} style={{ background: accent + "14", color: accent, border: `1px solid ${accent}30`, borderRadius: 4, padding: "2px 8px", fontSize: 9.5, fontFamily: "sans-serif", fontWeight: 600 }}>{s}</span>
              ))}
            </div>
          </>}
          {certLines.length > 0 && <>
            <SectionTitle>Certifications</SectionTitle>
            {certLines.map((c, i) => <div key={i} style={{ fontSize: 10, color: "#444", marginBottom: 3 }}>• {c}</div>)}
          </>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RESUME TEMPLATE: NOVA
═══════════════════════════════════════════════════════════ */
function TemplateNova({ parsed, accent = "#6D3BE8" }) {
  const skillList = parsed.skills.join(" ").split(/[,•·|;\n]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 40).slice(0, 20);
  const expLines = parsed.experience || [];
  const projLines = parsed.projects || [];
  const eduLines = parsed.education || [];
  const certLines = parsed.certifications || [];
  const light = accent + "14";
  const mid = accent + "30";

  return (
    <div style={{ fontFamily: "'Arial', sans-serif", width: "100%", minHeight: 1056, background: "#fff", boxSizing: "border-box", fontSize: 11, lineHeight: 1.55, color: "#1a1a2e" }}>
      <div style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}CC 100%)`, padding: "30px 36px 24px", color: "#fff", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: -20, right: 60, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, marginBottom: 4, position: "relative" }}>{parsed.name || "Your Name"}</div>
        <div style={{ fontSize: 9.5, opacity: 0.85, position: "relative", display: "flex", gap: 16, flexWrap: "wrap" }}>
          {parsed.email && <span>✉ {parsed.email}</span>}
          {parsed.phone && <span>☎ {parsed.phone}</span>}
          {parsed.linkedin && <span>in {parsed.linkedin}</span>}
          {parsed.github && <span>⊞ {parsed.github}</span>}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 0 }}>
        <div style={{ padding: "24px 28px" }}>
          {parsed.summary && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.8, color: accent, marginBottom: 6 }}>About Me</div>
              <p style={{ margin: 0, fontSize: 10.5, color: "#444", lineHeight: 1.7, borderLeft: `3px solid ${accent}`, paddingLeft: 12 }}>{parsed.summary}</p>
            </div>
          )}
          {expLines.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.8, color: accent, marginBottom: 8 }}>Experience</div>
              {expLines.map((line, i) => {
                const isBullet = line.startsWith("-") || line.startsWith("•");
                return isBullet
                  ? <div key={i} style={{ fontSize: 10, color: "#555", paddingLeft: 14, marginBottom: 3, position: "relative" }}><span style={{ position: "absolute", left: 4, color: accent, fontWeight: 900 }}>·</span>{line.replace(/^[-•]\s*/, "")}</div>
                  : <div key={i} style={{ fontWeight: 800, fontSize: 10.5, color: "#1a1a2e", marginTop: i > 0 ? 10 : 0, marginBottom: 3, background: light, padding: "3px 8px", borderRadius: 4 }}>{line}</div>;
              })}
            </div>
          )}
          {projLines.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.8, color: accent, marginBottom: 8 }}>Projects</div>
              {projLines.map((line, i) => {
                const isBullet = line.startsWith("-") || line.startsWith("•");
                return isBullet
                  ? <div key={i} style={{ fontSize: 10, color: "#555", paddingLeft: 14, marginBottom: 3, position: "relative" }}><span style={{ position: "absolute", left: 4, color: accent, fontWeight: 900 }}>·</span>{line.replace(/^[-•]\s*/, "")}</div>
                  : <div key={i} style={{ fontWeight: 800, fontSize: 10.5, color: "#1a1a2e", marginTop: i > 0 ? 10 : 0, marginBottom: 3, background: light, padding: "3px 8px", borderRadius: 4 }}>{line}</div>;
              })}
            </div>
          )}
          {eduLines.length > 0 && (
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.8, color: accent, marginBottom: 8 }}>Education</div>
              {eduLines.map((line, i) => {
                const isBullet = line.startsWith("-") || line.startsWith("•");
                return isBullet
                  ? <div key={i} style={{ fontSize: 10, color: "#555", paddingLeft: 12, marginBottom: 3 }}>{line.replace(/^[-•]\s*/, "")}</div>
                  : <div key={i} style={{ fontWeight: 700, fontSize: 10.5, color: "#1a1a2e", marginTop: i > 0 ? 8 : 0, marginBottom: 2 }}>{line}</div>;
              })}
            </div>
          )}
        </div>
        <div style={{ background: "#f8f6ff", padding: "24px 16px", borderLeft: `2px solid ${mid}` }}>
          {skillList.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: accent, marginBottom: 10 }}>Skills</div>
              {skillList.map((s, i) => (
                <div key={i} style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 600, color: "#333", marginBottom: 2 }}>{s}</div>
                  <div style={{ height: 4, background: "#e0d9ff", borderRadius: 99 }}>
                    <div style={{ width: `${65 + (i * 7) % 30}%`, height: "100%", background: accent, borderRadius: 99, opacity: 0.8 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {certLines.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: accent, marginBottom: 8 }}>Certs</div>
              {certLines.map((c, i) => <div key={i} style={{ fontSize: 9.5, color: "#555", marginBottom: 5, background: "#fff", padding: "4px 8px", borderRadius: 6, border: `1px solid ${mid}` }}>{c}</div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResumeTemplateRenderer({ templateId, parsed, accent }) {
  if (templateId === "meridian") return <TemplateMeridian parsed={parsed} accent={accent} />;
  if (templateId === "nova") return <TemplateNova parsed={parsed} accent={accent} />;
  return <TemplateAtlas parsed={parsed} accent={accent} />;
}

/* ═══════════════════════════════════════════════════════════
   HTML RESUME BUILDERS
═══════════════════════════════════════════════════════════ */
function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderLinesHtml(lines, accentHex) {
  return (lines || []).map(line => {
    const isBullet = /^[-•▸]/.test(line.trim());
    if (isBullet) return `<div class="bullet">▸ ${esc(line.replace(/^[-•▸]\s*/, ""))}</div>`;
    return `<div class="entry-title">${esc(line)}</div>`;
  }).join("");
}

function buildAtlasHtml(parsed, accent) {
  const skillList = (parsed.skills || []).join(" ").split(/[,•·|;\n]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 40).slice(0, 22);
  const expLines = [...(parsed.experience || []), ...(parsed.projects || [])];
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&family=Merriweather:wght@400;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Lato',sans-serif;display:flex;min-height:100vh;color:#1a1a2e;font-size:10.5pt;line-height:1.55;}.sidebar{width:210px;background:${accent};color:#fff;padding:32px 18px;flex-shrink:0;}.main{flex:1;padding:32px 28px;}.name{font-size:17pt;font-weight:900;line-height:1.15;margin-bottom:3px;word-break:break-word;}.tagline{font-size:8pt;opacity:.7;text-transform:uppercase;letter-spacing:1.6px;border-bottom:1px solid rgba(255,255,255,.22);padding-bottom:14px;margin-bottom:18px;}.side-label{font-size:7.5pt;text-transform:uppercase;letter-spacing:1.4px;opacity:.65;font-weight:700;margin-bottom:7px;margin-top:14px;}.contact-item{font-size:8.5pt;opacity:.88;margin-bottom:4px;word-break:break-all;}.skill-row{margin-bottom:6px;}.skill-name{font-size:8.5pt;opacity:.92;margin-bottom:2px;}.skill-track{height:3px;background:rgba(255,255,255,.18);border-radius:99px;}.skill-fill{height:100%;background:rgba(255,255,255,.72);border-radius:99px;}.cert-item{font-size:8.5pt;opacity:.88;margin-bottom:4px;}.sec-title{font-size:8.5pt;font-weight:800;text-transform:uppercase;letter-spacing:1.6px;color:${accent};border-bottom:2px solid ${accent};padding-bottom:3px;margin-bottom:9px;margin-top:18px;}.sec-title:first-child{margin-top:0;}.summary-text{font-size:10pt;color:#333;line-height:1.72;}.entry-title{font-weight:700;font-size:10.5pt;color:#1a1a2e;margin-top:10px;margin-bottom:2px;}.entry-title:first-child{margin-top:0;}.bullet{font-size:9.5pt;color:#444;padding-left:14px;margin-bottom:2px;}</style></head><body><div class="sidebar"><div class="name">${esc(parsed.name||"Your Name")}</div><div class="tagline">Resume</div><div class="side-label">Contact</div>${parsed.email?`<div class="contact-item">✉ ${esc(parsed.email)}</div>`:""} ${parsed.phone?`<div class="contact-item">☎ ${esc(parsed.phone)}</div>`:""} ${parsed.linkedin?`<div class="contact-item">in ${esc(parsed.linkedin)}</div>`:""} ${parsed.github?`<div class="contact-item">⊞ ${esc(parsed.github)}</div>`:""} ${skillList.length?`<div class="side-label">Skills</div>`+skillList.map((s,i)=>`<div class="skill-row"><div class="skill-name">${esc(s)}</div><div class="skill-track"><div class="skill-fill" style="width:${68+(i*7)%28}%"></div></div></div>`).join(""):""}${(parsed.certifications||[]).length?`<div class="side-label">Certifications</div>`+(parsed.certifications||[]).map(c=>`<div class="cert-item">• ${esc(c)}</div>`).join(""):""}</div><div class="main">${parsed.summary?`<div class="sec-title">Profile</div><p class="summary-text">${esc(parsed.summary)}</p>`:""}${expLines.length?`<div class="sec-title">Experience &amp; Projects</div>${renderLinesHtml(expLines,accent)}`:""}${(parsed.education||[]).length?`<div class="sec-title">Education</div>${renderLinesHtml(parsed.education,accent)}`:""}</div></body></html>`;
}

function buildMeridianHtml(parsed, accent) {
  const skillList = (parsed.skills || []).join(" ").split(/[,•·|;\n]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 40).slice(0, 20);
  const section = (title, content) => content ? `<div class="sec"><div class="sec-title"><span class="rule-bar"></span>${esc(title)}<span class="rule-line"></span></div>${content}</div>` : "";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@400;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Crimson Pro',Georgia,serif;padding:44px 52px;color:#1a1a2e;font-size:11pt;line-height:1.62;background:#fff;}.header{border-bottom:3px solid ${accent};padding-bottom:14px;margin-bottom:0;}.name{font-family:'DM Sans',sans-serif;font-weight:900;font-size:24pt;letter-spacing:-.4px;color:${accent};line-height:1.1;margin-bottom:6px;}.contacts{display:flex;gap:18px;flex-wrap:wrap;font-size:9pt;color:#555;font-family:'DM Sans',sans-serif;}.sec{margin-top:14px;}.sec-title{display:flex;align-items:center;gap:9px;margin-bottom:9px;}.rule-bar{width:3px;height:14px;background:${accent};border-radius:2px;flex-shrink:0;}.rule-line{flex:1;height:1px;background:#ddd;}.sec-title span:not(.rule-bar):not(.rule-line){font-family:'DM Sans',sans-serif;font-weight:800;font-size:8.5pt;text-transform:uppercase;letter-spacing:1.8px;color:${accent};}.summary{font-size:10.5pt;color:#333;line-height:1.72;}.entry-title{font-family:'DM Sans',sans-serif;font-weight:700;font-size:11pt;color:#1a1a2e;margin-top:9px;margin-bottom:2px;}.entry-title:first-child{margin-top:0;}.bullet{font-size:10pt;color:#444;padding-left:14px;margin-bottom:2px;position:relative;}.bullet::before{content:'›';position:absolute;left:3px;color:${accent};}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:14px;}.chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px;}.chip{background:${accent}14;color:${accent};border:1px solid ${accent}30;border-radius:4px;padding:2px 9px;font-size:8.5pt;font-family:'DM Sans',sans-serif;font-weight:600;}</style></head><body><div class="header"><div class="name">${esc(parsed.name||"Your Name")}</div><div class="contacts">${parsed.email?`<span>✉ ${esc(parsed.email)}</span>`:""} ${parsed.phone?`<span>☎ ${esc(parsed.phone)}</span>`:""} ${parsed.linkedin?`<span>in ${esc(parsed.linkedin)}</span>`:""} ${parsed.github?`<span>⊞ ${esc(parsed.github)}</span>`:""}</div></div>${section("Executive Summary",parsed.summary?`<p class="summary">${esc(parsed.summary)}</p>`:"")}${section("Professional Experience",(parsed.experience||[]).length?renderLinesHtml(parsed.experience,accent):"")}${section("Key Projects",(parsed.projects||[]).length?renderLinesHtml(parsed.projects,accent):"")}<div class="two-col"><div>${section("Education",(parsed.education||[]).length?renderLinesHtml(parsed.education,accent):"")}${(parsed.certifications||[]).length?section("Certifications",(parsed.certifications||[]).map(c=>`<div class="bullet">${esc(c)}</div>`).join("")):"" }</div><div>${skillList.length?section("Core Skills",`<div class="chips">${skillList.map(s=>`<span class="chip">${esc(s)}</span>`).join("")}</div>`):""}</div></div></body></html>`;
}

function buildNovaHtml(parsed, accent) {
  const skillList = (parsed.skills || []).join(" ").split(/[,•·|;\n]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 40).slice(0, 22);
  const light = accent + "14";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Plus Jakarta Sans',sans-serif;color:#1a1a2e;font-size:10pt;line-height:1.55;background:#fff;}.header{background:linear-gradient(135deg,${accent},${accent}CC);color:#fff;padding:28px 34px 22px;position:relative;overflow:hidden;}.name{font-size:22pt;font-weight:800;letter-spacing:-.4px;margin-bottom:5px;position:relative;}.contacts{display:flex;gap:14px;flex-wrap:wrap;font-size:8.5pt;opacity:.88;position:relative;}.body{display:grid;grid-template-columns:1fr 186px;}.main-col{padding:22px 24px;}.side-col{background:#f8f6ff;border-left:2px solid ${accent}30;padding:22px 14px;}.sec-label{font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:1.8px;color:${accent};margin-bottom:7px;margin-top:16px;}.sec-label:first-child{margin-top:0;}.summary{font-size:10pt;color:#444;line-height:1.72;border-left:3px solid ${accent};padding-left:11px;}.entry-title{font-weight:800;font-size:10.5pt;color:#1a1a2e;background:${light};padding:3px 8px;border-radius:4px;margin-top:9px;margin-bottom:3px;display:block;}.entry-title:first-child{margin-top:0;}.bullet{font-size:9.5pt;color:#555;padding-left:14px;margin-bottom:2px;position:relative;}.skill-row{margin-bottom:6px;}.skill-name{font-size:8.5pt;font-weight:600;color:#333;margin-bottom:2px;}.skill-track{height:4px;background:#e0d9ff;border-radius:99px;}.skill-fill{height:100%;background:${accent};border-radius:99px;opacity:.8;}.cert-chip{font-size:8pt;color:#555;background:#fff;border:1px solid ${accent}35;border-radius:6px;padding:3px 8px;margin-bottom:4px;display:block;}</style></head><body><div class="header"><div class="name">${esc(parsed.name||"Your Name")}</div><div class="contacts">${parsed.email?`<span>✉ ${esc(parsed.email)}</span>`:""} ${parsed.phone?`<span>☎ ${esc(parsed.phone)}</span>`:""} ${parsed.linkedin?`<span>in ${esc(parsed.linkedin)}</span>`:""} ${parsed.github?`<span>⊞ ${esc(parsed.github)}</span>`:""}</div></div><div class="body"><div class="main-col">${parsed.summary?`<div class="sec-label">About Me</div><p class="summary">${esc(parsed.summary)}</p>`:""}${(parsed.experience||[]).length?`<div class="sec-label">Experience</div>${renderLinesHtml(parsed.experience,accent)}`:""}${(parsed.projects||[]).length?`<div class="sec-label">Projects</div>${renderLinesHtml(parsed.projects,accent)}`:""}${(parsed.education||[]).length?`<div class="sec-label">Education</div>${renderLinesHtml(parsed.education,accent)}`:""}</div><div class="side-col">${skillList.length?`<div class="sec-label">Skills</div>`+skillList.map((s,i)=>`<div class="skill-row"><div class="skill-name">${esc(s)}</div><div class="skill-track"><div class="skill-fill" style="width:${65+(i*7)%30}%"></div></div></div>`).join(""):""}${(parsed.certifications||[]).length?`<div class="sec-label" style="margin-top:14px;">Certs</div>`+(parsed.certifications||[]).map(c=>`<span class="cert-chip">${esc(c)}</span>`).join(""):""}</div></div></body></html>`;
}

function buildResumeHtml(templateId, parsed, accent) {
  if (templateId === "meridian") return buildMeridianHtml(parsed, accent);
  if (templateId === "nova") return buildNovaHtml(parsed, accent);
  return buildAtlasHtml(parsed, accent);
}

async function loadScript(src, checkGlobal) {
  return new Promise((res, rej) => {
    if (checkGlobal && window[checkGlobal]) { res(); return; }
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      const poll = setInterval(() => { if (!checkGlobal || window[checkGlobal]) { clearInterval(poll); res(); } }, 50);
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => res();
    s.onerror = () => rej(new Error("Failed to load: " + src));
    document.head.appendChild(s);
  });
}

async function downloadResumeAsPdf(domNode, filename) {
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js", "html2canvas");
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", "jspdf");

  const canvas = await window.html2canvas(domNode, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    width: domNode.scrollWidth,
    height: domNode.scrollHeight,
  });

  const { jsPDF } = window.jspdf;
  const imgData = canvas.toDataURL("image/jpeg", 0.98);
  const pxToMm = 0.2645833;
  const pdfW = (canvas.width / 2) * pxToMm;
  const pdfH = (canvas.height / 2) * pxToMm;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [pdfW, pdfH] });
  pdf.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH);
  pdf.save(`${filename || "resume_CVision"}.pdf`);
}

/* ═══════════════════════════════════════════════════════════
   AUTH PAGE
═══════════════════════════════════════════════════════════ */
function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);

  const reset = (newMode) => { setMode(newMode); setError(""); setSuccess(""); setUsername(""); setPassword(""); setName(""); setConfirmPass(""); };

  const handleLogin = async () => {
    setError("");
    if (!username.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const user = authStore.find(username.trim());
    if (!user) { setError("No account found. Want to sign up instead?"); setLoading(false); return; }
    if (user.password !== password) { setError("Incorrect password."); setLoading(false); return; }
    setLoading(false); onLogin(user);
  };

  const handleSignup = async () => {
    setError("");
    if (!name.trim() || !username.trim() || !password.trim() || !confirmPass.trim()) { setError("Please fill in all fields."); return; }
    if (username.trim().length < 3) { setError("Username must be at least 3 characters."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPass) { setError("Passwords don't match."); return; }
    if (authStore.find(username.trim())) { setError("Username already taken."); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    authStore.add(username.trim(), password, name.trim());
    setLoading(false); setSuccess("Account created! Signing you in…");
    await new Promise(r => setTimeout(r, 900));
    onLogin(authStore.find(username.trim()));
  };

  const iStyle = (field) => ({ width:"100%", padding:"12px 14px", border:`1.5px solid ${focused===field?T.blue:T.border}`, borderRadius:10, fontSize:13.5, fontFamily:"'DM Sans',sans-serif", color:T.text, background:T.faint, boxSizing:"border-box", outline:"none", transition:"border-color 0.2s, box-shadow 0.2s", boxShadow:focused===field?`0 0 0 3px ${T.blue}18`:"none" });

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif", padding:"20px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", background:`radial-gradient(ellipse 700px 500px at 10% 20%, ${T.blue}0B, transparent), radial-gradient(ellipse 600px 400px at 90% 80%, ${T.purple}09, transparent)` }}/>
      <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:440 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:52, height:52, borderRadius:16, background:`linear-gradient(135deg,${T.blue},${T.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, margin:"0 auto 14px", boxShadow:`0 8px 24px ${T.blue}30` }}>👁️</div>
          <div style={{ fontFamily:"'Fraunces',serif", fontWeight:900, fontSize:30, color:T.text, letterSpacing:-1 }}>CVision</div>
          <div style={{ fontSize:10, color:T.muted, letterSpacing:2.5, textTransform:"uppercase", marginTop:4 }}>Career Intelligence</div>
        </div>
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:20, padding:"32px 32px 28px", boxShadow:"0 4px 32px rgba(22,25,42,0.08)" }}>
          <div style={{ display:"flex", gap:3, background:T.faint, borderRadius:11, padding:3, marginBottom:28 }}>
            {[["login","Sign In"],["signup","Create Account"]].map(([m,l])=>(
              <button key={m} onClick={()=>reset(m)} style={{ flex:1, padding:"9px 0", border:"none", borderRadius:9, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:m===mode?700:500, fontSize:13.5, background:m===mode?"#fff":"transparent", color:m===mode?T.blue:T.muted, boxShadow:m===mode?"0 1px 4px rgba(0,0,0,0.09)":"none", transition:"all 0.2s" }}>{l}</button>
            ))}
          </div>
          <div style={{ marginBottom:22 }}>
            <div style={{ fontFamily:"'Fraunces',serif", fontWeight:900, fontSize:22, color:T.text, marginBottom:5 }}>{mode==="login"?"Welcome back 👋":"Join CVision 🚀"}</div>
            <div style={{ fontSize:13, color:T.muted, lineHeight:1.55 }}>{mode==="login"?"Sign in to analyse resumes & GitHub profiles.":"Create your free account to get started."}</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {mode==="signup"&&<div><label style={{fontSize:11.5,fontWeight:700,color:T.sub,letterSpacing:0.4,textTransform:"uppercase",display:"block",marginBottom:6}}>Full Name</label><input value={name} onChange={e=>{setName(e.target.value);setError("");}} placeholder="Your full name" style={iStyle("name")} onFocus={()=>setFocused("name")} onBlur={()=>setFocused(null)} onKeyDown={e=>e.key==="Enter"&&handleSignup()}/></div>}
            <div><label style={{fontSize:11.5,fontWeight:700,color:T.sub,letterSpacing:0.4,textTransform:"uppercase",display:"block",marginBottom:6}}>Username</label><input value={username} onChange={e=>{setUsername(e.target.value);setError("");}} placeholder={mode==="login"?"Enter your username":"Choose a username"} style={iStyle("username")} onFocus={()=>setFocused("username")} onBlur={()=>setFocused(null)} onKeyDown={e=>e.key==="Enter"&&(mode==="login"?handleLogin():handleSignup())} autoComplete="username"/></div>
            <div><label style={{fontSize:11.5,fontWeight:700,color:T.sub,letterSpacing:0.4,textTransform:"uppercase",display:"block",marginBottom:6}}>Password</label><div style={{position:"relative"}}><input type={showPass?"text":"password"} value={password} onChange={e=>{setPassword(e.target.value);setError("");}} placeholder={mode==="login"?"Enter your password":"At least 6 characters"} style={{...iStyle("password"),paddingRight:44}} onFocus={()=>setFocused("password")} onBlur={()=>setFocused(null)} onKeyDown={e=>e.key==="Enter"&&(mode==="login"?handleLogin():handleSignup())} autoComplete={mode==="login"?"current-password":"new-password"}/><button onClick={()=>setShowPass(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:14,color:T.muted,padding:4}}>{showPass?"🙈":"👁"}</button></div></div>
            {mode==="signup"&&<div><label style={{fontSize:11.5,fontWeight:700,color:T.sub,letterSpacing:0.4,textTransform:"uppercase",display:"block",marginBottom:6}}>Confirm Password</label><input type={showPass?"text":"password"} value={confirmPass} onChange={e=>{setConfirmPass(e.target.value);setError("");}} placeholder="Repeat your password" style={{...iStyle("confirm"),borderColor:confirmPass&&confirmPass!==password?T.red:focused==="confirm"?T.blue:T.border}} onFocus={()=>setFocused("confirm")} onBlur={()=>setFocused(null)} onKeyDown={e=>e.key==="Enter"&&handleSignup()} autoComplete="new-password"/>{confirmPass&&confirmPass!==password&&<div style={{marginTop:4,fontSize:11.5,color:T.red}}>Passwords don't match</div>}</div>}
          </div>
          {error&&<div style={{marginTop:14,padding:"10px 13px",background:T.redLight,border:`1px solid ${T.red}28`,borderRadius:9,color:T.red,fontSize:13,display:"flex",gap:8,alignItems:"flex-start",lineHeight:1.5}}><span>⚠️</span><span>{error}</span></div>}
          {success&&<div style={{marginTop:14,padding:"10px 13px",background:T.greenLight,border:`1px solid ${T.green}28`,borderRadius:9,color:T.green,fontSize:13,display:"flex",gap:8}}><span>✅</span><span>{success}</span></div>}
          <button onClick={mode==="login"?handleLogin:handleSignup} disabled={loading} style={{ marginTop:20, width:"100%", padding:"14px", borderRadius:11, border:"none", background:loading?"#C8CDD8":`linear-gradient(135deg,${T.blue},${T.purple})`, color:"#fff", fontWeight:700, fontSize:14.5, cursor:loading?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:loading?"none":`0 4px 18px ${T.blue}35` }}>
            {loading?(<span style={{display:"inline-flex",alignItems:"center",gap:8}}><span style={{width:16,height:16,borderRadius:"50%",border:"2.5px solid #fff4",borderTopColor:"#fff",display:"inline-block",animation:"spin 0.8s linear infinite"}}/>{mode==="login"?"Signing in…":"Creating account…"}</span>):mode==="login"?"⚡  Sign In":"🚀  Create Account"}
          </button>
          <div style={{marginTop:18,textAlign:"center",fontSize:13,color:T.muted}}>
            {mode==="login"?(<>Don't have an account?{" "}<button onClick={()=>reset("signup")} style={{background:"none",border:"none",color:T.blue,fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:"'DM Sans',sans-serif",padding:0}}>Sign up free →</button></>):(<>Already have an account?{" "}<button onClick={()=>reset("login")} style={{background:"none",border:"none",color:T.blue,fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:"'DM Sans',sans-serif",padding:0}}>Sign in →</button></>)}
          </div>
        </div>
        <div style={{marginTop:14,padding:"11px 16px",background:T.amberLight,border:`1px solid ${T.amber}28`,borderRadius:12,display:"flex",gap:10,alignItems:"flex-start"}}>
          <span>💡</span>
          <div style={{fontSize:12,color:T.text,lineHeight:1.55}}><strong>Demo:</strong> username <code style={{background:T.faint,padding:"1px 6px",borderRadius:4,fontFamily:"'DM Mono',monospace",fontSize:11}}>demo</code> · password <code style={{background:T.faint,padding:"1px 6px",borderRadius:4,fontFamily:"'DM Mono',monospace",fontSize:11}}>demo123</code></div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PDF EXTRACTION
═══════════════════════════════════════════════════════════ */
async function extractTextFromPDF(file) {
  if (!window.pdfjsLib) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = res; s.onerror = () => rej(new Error("Failed to load PDF reader."));
      document.head.appendChild(s);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const c = await page.getTextContent();
    text += c.items.map(x => x.str).join(" ") + "\n";
  }
  if (!text.trim() || text.trim().length < 30) throw new Error("Couldn't extract text. Use the Paste Text option instead.");
  return text.trim();
}

function parseGitHubInput(raw) {
  const s = raw.trim().replace(/^@/, "");
  const urlMatch = s.match(/github\.com\/([A-Za-z0-9_.-]+)/i);
  if (urlMatch) return urlMatch[1];
  if (/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(s)) return s;
  return s;
}
async function ghGet(path) {
  return fetch(`https://api.github.com${path}`, { headers: { "Accept":"application/vnd.github.v3+json","X-GitHub-Api-Version":"2022-11-28" } });
}
async function fetchGitHubData(rawInput) {
  const username = parseGitHubInput(rawInput);
  let userRes, reposRes;
  try { [userRes, reposRes] = await Promise.all([ghGet(`/users/${username}`), ghGet(`/users/${username}/repos?per_page=100&sort=updated&type=owner`)]); }
  catch (e) { throw new Error(`Network error: ${e.message}`); }
  if (!userRes.ok) {
    if (userRes.status === 404) throw new Error(`No GitHub account found for "${username}".`);
    if (userRes.status === 403) throw new Error("GitHub rate limit reached. Please wait a minute.");
    throw new Error(`GitHub returned HTTP ${userRes.status}.`);
  }
  const user = await userRes.json();
  let repos = []; if (reposRes.ok) { try { repos = await reposRes.json(); } catch {} }
  if (!Array.isArray(repos)) repos = [];
  const ownRepos = repos.filter(r => !r.fork);
  const langResults = await Promise.allSettled(ownRepos.slice(0,10).map(async r => { try { const res = await ghGet(`/repos/${username}/${r.name}/languages`); return res.ok ? await res.json() : {}; } catch { return {}; } }));
  const langMap = {};
  langResults.forEach(r => { if (r.status==="fulfilled" && r.value) Object.entries(r.value).forEach(([l,b]) => { langMap[l]=(langMap[l]||0)+b; }); });
  return { user, repos: ownRepos, langMap };
}

function sanitizeText(text, maxLen = 8000) {
  if (!text) return "";
  return String(text).replace(/\u0000/g,"").replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/[\r\n]+/g," ").trim().slice(0, maxLen);
}
function extractJSON(raw) {
  if (!raw || typeof raw !== "string") throw new Error("Empty AI response.");
  let s = raw.replace(/```json\s*/gi,"").replace(/```/g,"").trim();
  const start = s.indexOf("{");
  if (start===-1) throw new Error("AI did not return a JSON object.");
  let depth=0, end=-1;
  for (let i=start;i<s.length;i++) { if(s[i]==="{") depth++; else if(s[i]==="}"){depth--;if(depth===0){end=i;break;}} }
  if (end===-1) { let o=0,a=0; for(const ch of s.slice(start)){if(ch==="{")o++;else if(ch==="}")o--;else if(ch==="[")a++;else if(ch==="]")a--;} s=s.slice(start).trimEnd().replace(/,\s*$/,"")+"]".repeat(Math.max(0,a))+"}".repeat(Math.max(1,o)); }
  else { s=s.slice(start,end+1); }
  try { return JSON.parse(s); } catch { const lc=s.lastIndexOf(","); if(lc!==-1){try{return JSON.parse(s.slice(0,lc)+"}");}catch{}} throw new Error("Could not parse AI response."); }
}
async function callClaude(system, userText, maxTokens) {
  let res;
  try { res = await fetch("/api/claude", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:maxTokens,system,messages:[{role:"user",content:userText}]}) }); }
  catch(e) { throw new Error("Network error — could not reach the AI."); }
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message||`API error ${res.status}`);
  if (data.error) throw new Error(data.error.message||"API error.");
  return (data.content||[]).map(b=>b.text||"").join("");
}

async function analyzeResume(resumeText, jobDescription, experienceLevel, companyType) {
  const safeResume=sanitizeText(resumeText,8000), safeJD=sanitizeText(jobDescription,2000);
  const raw = await callClaude(
    "You are an expert ATS resume analyzer. Output ONLY a valid JSON object — no markdown, no prose. Start with { end with }.",
    `RESUME:\n${safeResume}\n\nJOB DESCRIPTION:\n${safeJD}\n\nEXPERIENCE LEVEL: ${experienceLevel}\nCOMPANY TYPE: ${companyType}\n\nRespond ONLY with this JSON:\n{"detectedRole":"","atsScore":0,"atsCompatibility":{"score":0,"hasPhoto":false,"photoNote":"","formattingIssues":[],"atsUnfriendlyElements":[],"goodPractices":[]},"sectionScores":{"contact":{"score":0,"feedback":"","missing":[]},"summary":{"score":0,"feedback":"","missing":[]},"experience":{"score":0,"feedback":"","hasExperience":false},"education":{"score":0,"feedback":"","missing":[]},"skills":{"score":0,"feedback":"","missing":[]},"projects":{"score":0,"feedback":"","missing":[]},"certifications":{"score":0,"feedback":""}},"companyFitAnalysis":{"fitScore":0,"strengths":[],"gaps":[],"recommendation":""},"jobDescriptionMatch":{"matchScore":0,"matchedKeywords":[],"missingKeywords":[],"relevantSkillsFound":[],"irrelevantContent":[]},"bulletImprovements":[{"before":"","after":"","reason":""}],"problems":[],"strengths":[],"quickWins":[],"overallFeedback":""}`,
    5000
  );
  return extractJSON(raw);
}

async function generateOptimizedResume(resumeText, jobDescription, experienceLevel, companyType, analysis) {
  const safeResume=sanitizeText(resumeText,7000), safeJD=sanitizeText(jobDescription,2000);
  const raw = await callClaude(
    "You are an expert resume writer. Return ONLY the optimized plain-text resume. No JSON, no markdown, no explanation.",
    `ORIGINAL RESUME:\n${safeResume}\n\nJOB DESCRIPTION:\n${safeJD}\n\nEXPERIENCE LEVEL: ${experienceLevel}\nCOMPANY TYPE: ${companyType}\nKEY ISSUES: ${(analysis.problems||[]).join("; ")}\nMISSING KEYWORDS: ${(analysis.jobDescriptionMatch?.missingKeywords||[]).join(", ")}\n\nProduce a fully optimized ATS-ready plain-text resume. Standard headers. Dash bullets only. Return ONLY the resume text.`,
    3000
  );
  return raw.replace(/```[a-z]*\n?/gi,"").replace(/```/g,"").trim();
}

async function analyzeGitHub(ghData, targetRole) {
  const { user, repos, langMap } = ghData;
  const repoLines = repos.slice(0,15).map((r,i)=>`${i+1}. ${r.name} | lang:${r.language||"?"} | stars:${r.stargazers_count} | desc:${sanitizeText(r.description||"",120)}`).join("\n");
  const langLines = Object.entries(langMap).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([l,b])=>`${l}: ${b} bytes`).join(", ");
  const raw = await callClaude(
    "You are an expert developer profile evaluator. Output ONLY a valid JSON object.",
    `GITHUB USER: ${user.login}\nNAME: ${sanitizeText(user.name||"",100)}\nBIO: ${sanitizeText(user.bio||"",200)}\nPUBLIC REPOS: ${user.public_repos} | FOLLOWERS: ${user.followers}\nLANGUAGES: ${langLines}\n\nREPOSITORIES:\n${repoLines}\n\nTARGET ROLE: ${targetRole||"Software Developer"}\n\nRespond ONLY:\n{"overallScore":0,"profileCompleteness":0,"activityScore":0,"codeQualityScore":0,"portfolioStrength":0,"summary":"","topLanguages":[{"name":"","percentage":0,"level":"Beginner"}],"repoAnalysis":[{"name":"","complexityScore":0,"impressiveness":0,"feedback":"","tags":[]}],"commitPatterns":{"assessment":"sporadic","note":""},"strengths":[],"weaknesses":[],"missingForRole":[],"standoutProjects":[],"recommendations":[],"hirabilityVerdict":"","redFlags":[]}`,
    4000
  );
  return extractJSON(raw);
}

/* ═══════════════════════════════════════════════════════════
   SHARED UI
═══════════════════════════════════════════════════════════ */
const scoreColor = s => s>=75?T.green:s>=50?T.amber:T.red;
const scoreBg = s => s>=75?T.greenLight:s>=50?T.amberLight:T.redLight;
const scoreLabel = s => s>=80?"Excellent":s>=65?"Good":s>=45?"Average":s>=25?"Needs Work":"Poor";

function ScoreRing({ score, size=84, label }) {
  const r=size/2-7, circ=2*Math.PI*r;
  const [anim, setAnim] = useState(0);
  useEffect(()=>{let start=null;const step=ts=>{if(!start)start=ts;const p=Math.min((ts-start)/850,1);setAnim(Math.round(p*score));if(p<1)requestAnimationFrame(step);};requestAnimationFrame(step);},[score]);
  const col=scoreColor(score);
  return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}><div style={{position:"relative",width:size,height:size}}><svg width={size} height={size} style={{position:"absolute",transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E8EBF3" strokeWidth={6.5}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={6.5} strokeDasharray={circ} strokeDashoffset={circ-(anim/100)*circ} strokeLinecap="round"/></svg><div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:size*0.22,fontWeight:800,color:col,fontFamily:"'DM Sans',sans-serif",lineHeight:1}}>{anim}</span><span style={{fontSize:8.5,color:T.muted,lineHeight:1}}>/100</span></div></div>{label&&<span style={{fontSize:11,fontWeight:600,color:T.sub,textAlign:"center"}}>{label}</span>}</div>);
}
function MiniBar({ value, max=10, color }) {
  const pct=Math.round((value/max)*100);
  return(<div style={{display:"flex",alignItems:"center",gap:8}}><div style={{flex:1,height:5,background:"#E8EBF3",borderRadius:99,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:99,transition:"width 0.9s ease"}}/></div><span style={{fontSize:11.5,fontWeight:700,color,minWidth:26,textAlign:"right"}}>{value}/{max}</span></div>);
}
function LangBar({ name, percentage, color }) {
  const [w,setW]=useState(0);useEffect(()=>{setTimeout(()=>setW(percentage),100);},[percentage]);
  return(<div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12.5,fontWeight:600,color:T.text}}>{name}</span><span style={{fontSize:11,color:T.muted,fontFamily:"'DM Mono',monospace"}}>{percentage}%</span></div><div style={{height:7,background:"#E8EBF3",borderRadius:99,overflow:"hidden"}}><div style={{width:`${w}%`,height:"100%",background:color,borderRadius:99,transition:"width 1.1s cubic-bezier(.4,0,.2,1)"}}/></div></div>);
}
const Chip=({children,color=T.blue,bg,mono=false})=>(<span style={{display:"inline-block",padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:600,color,background:bg||color+"18",margin:"2px 3px 2px 0",fontFamily:mono?"'DM Mono',monospace":"'DM Sans',sans-serif"}}>{children}</span>);
const Card=({children,style={}})=>(<div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:"18px 20px",...style}}>{children}</div>);
const SecHead=({icon,title,right,color=T.text})=>(<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:15}}>{icon}</span><span style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13.5,color}}>{title}</span></div>{right}</div>);
const Badge=({label,color=T.green,bg})=>(<span style={{padding:"2px 9px",borderRadius:99,fontSize:10.5,fontWeight:700,color,background:bg||color+"1A",letterSpacing:0.2}}>{label}</span>);
const LANG_COLORS={JavaScript:"#F7DF1E",TypeScript:"#3178C6",Python:"#3776AB",Java:"#ED8B00",Rust:"#CE422B","C++":"#00599C",Go:"#00ADD8",Swift:"#FA7343",Kotlin:"#7F52FF",Ruby:"#CC342D",PHP:"#777BB4","C#":"#239120",HTML:"#E34F26",CSS:"#1572B6",Shell:"#89E051",Vue:"#4FC08D",default:"#8891AA"};
const getLangColor=lang=>LANG_COLORS[lang]||LANG_COLORS.default;

/* ═══════════════════════════════════════════════════════════
   OPTIMISED RESUME TAB
═══════════════════════════════════════════════════════════ */
function OptimisedResumeTab({ resumeText, jobDesc, expLevel, companyType, analysis }) {
  const [optimizedResume, setOptimizedResume] = useState(null);
  const [generatingResume, setGeneratingResume] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [accentColor, setAccentColor] = useState(null);
  const [downloadDone, setDownloadDone] = useState(false);
  const [viewMode, setViewMode] = useState("template");

  const defaultTemplate = pickTemplate(analysis?.detectedRole, companyType);

  useEffect(() => {
    if (!selectedTemplate && defaultTemplate) {
      setSelectedTemplate(defaultTemplate);
      setAccentColor(defaultTemplate.accentDefault);
    }
  }, [defaultTemplate?.id]);

  const parsed = optimizedResume ? parseResumeText(optimizedResume) : null;
  const activeTemplate = selectedTemplate || defaultTemplate;
  const activeAccent = accentColor || activeTemplate?.accentDefault || "#2B5CE6";

  const handleGenerate = async () => {
    setGeneratingResume(true);
    try {
      const result = await generateOptimizedResume(resumeText, jobDesc, expLevel, companyType, analysis);
      setOptimizedResume(result);
      setViewMode("template");
    } catch(e) { alert("Failed to generate: " + e.message); }
    finally { setGeneratingResume(false); }
  };

  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef(null);

  const handleDownload = async () => {
    if (!parsed || downloading) return;
    // Switch to template view first so the node is mounted
    setViewMode("template");
    // Let React render the template before we capture it
    await new Promise(r => setTimeout(r, 120));
    if (!previewRef.current) { alert("Preview not ready — please make sure Template view is selected."); return; }
    setDownloading(true);
    try {
      const safeName = (parsed.name || "resume").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
      await downloadResumeAsPdf(previewRef.current, `${safeName}_CVision_${activeTemplate?.name}`);
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 3000);
    } catch(e) {
      alert("PDF generation failed: " + e.message);
    } finally {
      setDownloading(false);
    }
  };

  if (!optimizedResume && !generatingResume) return (
    <div style={{ textAlign:"center", padding:"48px 24px" }}>
      <div style={{ fontSize:52, marginBottom:16 }}>📄</div>
      <div style={{ fontFamily:"'Fraunces',serif", fontWeight:900, fontSize:22, color:T.text, marginBottom:10 }}>Generate Your Optimised Resume</div>
      <p style={{ color:T.muted, fontSize:14, maxWidth:520, margin:"0 auto 28px", lineHeight:1.7 }}>
        We'll apply all feedback — rewritten bullets, injected keywords, corrected sections — and render it in a beautiful template you can <strong>download instantly</strong> with one click.
      </p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, maxWidth:620, margin:"0 auto 28px", textAlign:"left" }}>
        {TEMPLATES.map(t => (
          <div key={t.id} onClick={() => { setSelectedTemplate(t); setAccentColor(t.accentDefault); }}
            style={{ background: selectedTemplate?.id===t.id ? T.blueLight : "#fff", border:`2px solid ${selectedTemplate?.id===t.id ? T.blue : T.border}`, borderRadius:14, padding:"16px 14px", cursor:"pointer", transition:"all 0.2s", position:"relative" }}>
            {defaultTemplate.id===t.id && <span style={{position:"absolute",top:10,right:10,fontSize:9,fontWeight:700,background:T.green,color:"#fff",padding:"2px 7px",borderRadius:99}}>BEST FIT</span>}
            <div style={{ fontWeight:800, fontSize:14, color:selectedTemplate?.id===t.id?T.blue:T.text, marginBottom:4 }}>{t.name}</div>
            <div style={{ fontSize:10, color:T.muted, marginBottom:5, fontStyle:"italic" }}>{t.tag}</div>
            <div style={{ fontSize:11, color:T.sub, lineHeight:1.45 }}>{t.desc}</div>
            <div style={{ marginTop:8, display:"flex", gap:4 }}>
              {[t.accentDefault, "#6D3BE8", "#12A150"].map(c=>(
                <div key={c} style={{width:10,height:10,borderRadius:99,background:c,opacity:.85}}/>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button onClick={handleGenerate} style={{ padding:"15px 44px", borderRadius:12, border:"none", background:`linear-gradient(135deg,${T.blue},${T.purple})`, color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", boxShadow:`0 6px 20px ${T.blue}35`, display:"inline-flex", alignItems:"center", gap:10 }}>
        ⚡ Generate &amp; Apply Template
      </button>
    </div>
  );

  if (generatingResume) return (
    <div style={{ textAlign:"center", padding:"60px 0" }}>
      <div style={{ width:52,height:52,borderRadius:99,background:T.blueLight,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",fontSize:22,animation:"spin 1.2s linear infinite" }}>✍️</div>
      <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:900, color:T.text, marginBottom:8 }}>Writing your optimised resume...</div>
      <div style={{ color:T.muted, fontSize:13 }}>Applying all fixes · Adding keywords · Rewriting bullets</div>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14, gap:12, flexWrap:"wrap" }}>
        <div>
          <div style={{ fontFamily:"'Fraunces',serif", fontWeight:900, fontSize:20, color:T.text }}>Your Optimised Resume</div>
          <div style={{ fontSize:12, color:T.muted, marginTop:3 }}>Template: <strong style={{color:T.text}}>{activeTemplate?.name}</strong> · {analysis?.detectedRole}</div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ display:"flex", gap:2, background:T.faint, borderRadius:9, padding:3 }}>
            {[["template","🎨 Template"],["text","📝 Plain Text"]].map(([v,l])=>(
              <button key={v} onClick={()=>setViewMode(v)} style={{ padding:"6px 13px", border:"none", borderRadius:7, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:v===viewMode?700:500, fontSize:12, background:v===viewMode?"#fff":"transparent", color:v===viewMode?T.blue:T.muted, boxShadow:v===viewMode?"0 1px 4px rgba(0,0,0,0.08)":"none", transition:"all 0.18s", whiteSpace:"nowrap" }}>{l}</button>
            ))}
          </div>
          <button onClick={()=>{navigator.clipboard.writeText(optimizedResume);setCopied(true);setTimeout(()=>setCopied(false),2500);}}
            style={{ padding:"8px 15px", borderRadius:9, border:`1.5px solid ${copied?T.green:T.border}`, background:copied?T.greenLight:"#fff", color:copied?T.green:T.sub, fontWeight:700, fontSize:12.5, cursor:"pointer", display:"flex", alignItems:"center", gap:6, transition:"all 0.2s" }}>
            {copied?"✅ Copied":"📋 Copy Text"}
          </button>
          <button onClick={handleDownload} disabled={downloading || !parsed}
            style={{ padding:"9px 20px", borderRadius:9, border:"none", background: downloadDone ? `linear-gradient(135deg,${T.green},#0ea047)` : downloading ? "#C8CDD8" : `linear-gradient(135deg,${T.blue},${T.purple})`, color:"#fff", fontWeight:800, fontSize:13, cursor: downloading ? "not-allowed" : "pointer", display:"flex", alignItems:"center", gap:8, boxShadow:`0 3px 14px ${downloadDone?T.green:downloading?"transparent":T.blue}40`, transition:"all 0.25s", fontFamily:"'DM Sans',sans-serif", letterSpacing:.2 }}>
            {downloading
              ? (<><span style={{width:14,height:14,borderRadius:"50%",border:"2px solid #fff4",borderTopColor:"#fff",display:"inline-block",animation:"spin 0.8s linear infinite"}}/> Generating PDF…</>)
              : (<><span style={{fontSize:15}}>{downloadDone?"✅":"⬇"}</span>{downloadDone ? "Saved! Check Downloads" : "Download PDF"}</>)
            }
          </button>
          <button onClick={()=>setOptimizedResume(null)} style={{ padding:"8px 14px", borderRadius:9, border:`1.5px solid ${T.border}`, background:"#fff", color:T.muted, fontWeight:600, fontSize:12.5, cursor:"pointer" }}>↺ Redo</button>
        </div>
      </div>
      <div style={{ marginBottom:14, padding:"11px 16px", background:`linear-gradient(135deg,${T.blue}0D,${T.purple}0A)`, border:`1px solid ${T.blue}22`, borderRadius:11, display:"flex", gap:12, alignItems:"flex-start" }}>
        <span style={{fontSize:18,flexShrink:0}}>💾</span>
        <div style={{fontSize:12.5,color:T.text,lineHeight:1.6}}>
          <strong>How to download:</strong> Click <strong>⬇ Download PDF</strong> — your resume will be generated as a ready-to-submit <strong>.pdf</strong> file and saved directly to your Downloads folder.
        </div>
      </div>
      {viewMode === "template" && (
        <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap", alignItems:"center", padding:"10px 14px", background:"#fff", border:`1px solid ${T.border}`, borderRadius:10 }}>
          <span style={{ fontSize:11.5, color:T.muted, fontWeight:700, marginRight:2 }}>Template:</span>
          {TEMPLATES.map(t=>(
            <button key={t.id} onClick={()=>{setSelectedTemplate(t);setAccentColor(t.accentDefault);}}
              style={{ padding:"5px 13px", borderRadius:99, border:`1.5px solid ${activeTemplate?.id===t.id?T.blue:T.border}`, background:activeTemplate?.id===t.id?T.blueLight:"#fff", color:activeTemplate?.id===t.id?T.blue:T.sub, fontSize:12, fontWeight:activeTemplate?.id===t.id?700:500, cursor:"pointer", transition:"all 0.18s", fontFamily:"'DM Sans',sans-serif", display:"inline-flex", alignItems:"center", gap:5 }}>
              {defaultTemplate.id===t.id&&<span style={{fontSize:8,background:T.green,color:"#fff",borderRadius:99,padding:"1px 5px",fontWeight:800}}>✦</span>}
              {t.name}
            </button>
          ))}
          <div style={{ width:1, height:20, background:T.border, margin:"0 4px" }}/>
          <span style={{ fontSize:11.5, color:T.muted, fontWeight:700 }}>Accent:</span>
          {["#2B5CE6","#6D3BE8","#12A150","#D63B3B","#C97A0A","#16192A","#0891b2","#b45309"].map(c=>(
            <button key={c} onClick={()=>setAccentColor(c)} style={{ width:22, height:22, borderRadius:99, background:c, border:activeAccent===c?"3px solid #16192A":"2.5px solid #fff", cursor:"pointer", boxShadow:"0 1px 5px rgba(0,0,0,0.22)", flexShrink:0, transition:"transform 0.15s", transform:activeAccent===c?"scale(1.18)":"scale(1)" }}/>
          ))}
        </div>
      )}
      {viewMode === "template" && parsed && (
        <div style={{ border:`1px solid ${T.border}`, borderRadius:14, overflow:"hidden", boxShadow:"0 4px 24px rgba(22,25,42,0.07)" }}>
          <div style={{ background:T.faint, borderBottom:`1px solid ${T.border}`, padding:"9px 16px", display:"flex", alignItems:"center", gap:7 }}>
            <div style={{width:10,height:10,borderRadius:99,background:"#FC5F57"}}/><div style={{width:10,height:10,borderRadius:99,background:"#FBBD2E"}}/><div style={{width:10,height:10,borderRadius:99,background:"#27C840"}}/>
            <span style={{fontSize:11,color:T.muted,marginLeft:10,fontFamily:"'DM Mono',monospace"}}>{(parsed.name||"resume").replace(/\s+/g,"_")}_CVision_{activeTemplate?.name}.html</span>
            <span style={{marginLeft:"auto",fontSize:10,color:T.muted,background:"#fff",border:`1px solid ${T.border}`,padding:"2px 9px",borderRadius:99}}>Preview · Letter size</span>
          </div>
          <div style={{ background:"#e8e8e8", padding:"20px 16px", overflowX:"auto" }}>
            <div ref={previewRef} style={{ width:794, margin:"0 auto", background:"#fff", boxShadow:"0 6px 28px rgba(0,0,0,0.18)", minHeight:520, fontFamily:"sans-serif" }}>
              <ResumeTemplateRenderer templateId={activeTemplate?.id} parsed={parsed} accent={activeAccent}/>
            </div>
          </div>
        </div>
      )}
      {viewMode === "text" && (
        <Card style={{ padding:0, overflow:"hidden" }}>
          <div style={{ background:T.faint, borderBottom:`1px solid ${T.border}`, padding:"9px 16px", display:"flex", alignItems:"center", gap:7 }}>
            <div style={{width:10,height:10,borderRadius:99,background:"#FC5F57"}}/><div style={{width:10,height:10,borderRadius:99,background:"#FBBD2E"}}/><div style={{width:10,height:10,borderRadius:99,background:"#27C840"}}/>
            <span style={{fontSize:11,color:T.muted,marginLeft:8,fontFamily:"'DM Mono',monospace"}}>optimised_resume.txt</span>
          </div>
          <textarea readOnly value={optimizedResume} style={{ width:"100%", minHeight:560, border:"none", padding:"22px 26px", fontSize:13, lineHeight:1.8, fontFamily:"'DM Mono',monospace", color:T.text, background:"#FAFBFD", resize:"vertical", boxSizing:"border-box", outline:"none" }}/>
        </Card>
      )}
      <div style={{ marginTop:12, padding:"11px 16px", background:T.amberLight, border:`1px solid ${T.amber}22`, borderRadius:10, fontSize:12.5, color:T.text, lineHeight:1.65, display:"flex", gap:10, alignItems:"flex-start" }}>
        <span style={{flexShrink:0}}>💡</span>
        <span><strong>Pro tip:</strong> The PDF is generated at 2× resolution for crisp printing. For best results, open in Adobe Reader or Chrome's PDF viewer before submitting to job applications.</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   GITHUB ANALYZER
═══════════════════════════════════════════════════════════ */
function GitHubAnalyzer() {
  const [ghInput,setGhInput]=useState("");const [targetRole,setTargetRole]=useState("Software Developer");const [phase,setPhase]=useState("input");const [ghData,setGhData]=useState(null);const [analysis,setAnalysis]=useState(null);const [error,setError]=useState(null);const [progress,setProgress]=useState(0);const [statusMsg,setStatusMsg]=useState("");const [activeTab,setActiveTab]=useState("overview");
  const handleAnalyze=async()=>{if(!ghInput.trim())return;setPhase("loading");setError(null);setProgress(0);const tick=setInterval(()=>setProgress(p=>Math.min(p+Math.random()*5,55)),250);let tick2=null;try{setStatusMsg("Fetching GitHub profile...");const data=await fetchGitHubData(ghInput.trim());setGhData(data);clearInterval(tick);setProgress(60);setStatusMsg("AI analyzing...");tick2=setInterval(()=>setProgress(p=>Math.min(p+Math.random()*3.5,93)),300);const result=await analyzeGitHub(data,targetRole);clearInterval(tick2);setProgress(100);setTimeout(()=>{setAnalysis(result);setPhase("results");setActiveTab("overview");},400);}catch(e){clearInterval(tick);if(tick2)clearInterval(tick2);setError(e.message||"Something went wrong.");setPhase("input");}};
  const reset=()=>{setPhase("input");setGhData(null);setAnalysis(null);setError(null);setGhInput("");setProgress(0);};
  const totalBytes=ghData?Object.values(ghData.langMap).reduce((a,b)=>a+b,0):0;
  const topLangs=ghData?Object.entries(ghData.langMap).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,bytes])=>({name,bytes,pct:Math.round((bytes/totalBytes)*100)})):[];
  if(phase==="input")return(<div style={{maxWidth:560,margin:"0 auto",paddingTop:16}}><div style={{textAlign:"center",marginBottom:28}}><div style={{width:52,height:52,borderRadius:16,background:T.github,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",fontSize:24}}>🐙</div><div style={{fontFamily:"'Fraunces',serif",fontSize:26,fontWeight:900,color:T.text,marginBottom:8}}>GitHub Profile Analyser</div><p style={{color:T.muted,fontSize:13.5,lineHeight:1.6,maxWidth:420,margin:"0 auto"}}>Enter a GitHub username or paste a full profile URL for a deep analysis.</p></div><Card><div style={{marginBottom:16}}><label style={{fontSize:12,fontWeight:700,color:T.sub,letterSpacing:0.4,textTransform:"uppercase",display:"block",marginBottom:7}}>GitHub Username or Profile URL</label><input value={ghInput} onChange={e=>{setGhInput(e.target.value);setError(null);}} onKeyDown={e=>e.key==="Enter"&&ghInput.trim()&&handleAnalyze()} placeholder="torvalds  or  https://github.com/torvalds" style={{width:"100%",padding:"12px 14px",border:`1.5px solid ${T.border}`,borderRadius:10,fontSize:13.5,fontFamily:"'DM Mono',monospace",color:T.text,background:T.faint,boxSizing:"border-box",outline:"none"}} onFocus={e=>e.target.style.borderColor=T.blue} onBlur={e=>e.target.style.borderColor=T.border}/><div style={{display:"flex",gap:10,marginTop:7,flexWrap:"wrap"}}>{["torvalds","gaearon","sindresorhus"].map(ex=>(<button key={ex} onClick={()=>{setGhInput(ex);setError(null);}} style={{padding:"3px 10px",borderRadius:99,border:`1px solid ${T.border}`,background:"#fff",color:T.muted,fontSize:11,cursor:"pointer",fontFamily:"'DM Mono',monospace"}}>@{ex}</button>))}</div></div><div style={{marginBottom:18}}><label style={{fontSize:12,fontWeight:700,color:T.sub,letterSpacing:0.4,textTransform:"uppercase",display:"block",marginBottom:7}}>Target Role</label><select value={targetRole} onChange={e=>setTargetRole(e.target.value)} style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${T.border}`,borderRadius:10,fontSize:13,color:T.text,background:"#fff",outline:"none"}}>{ROLES.map(r=><option key={r} value={r}>{r}</option>)}</select></div>{error&&<div style={{padding:"10px 13px",background:T.redLight,border:`1px solid ${T.red}30`,borderRadius:9,color:T.red,fontSize:13,marginBottom:14,display:"flex",gap:8}}><span>⚠️</span><span>{error}</span></div>}<button onClick={handleAnalyze} disabled={!ghInput.trim()} style={{width:"100%",padding:"14px",borderRadius:10,border:"none",background:ghInput.trim()?T.github:"#C8CDD8",color:"#fff",fontWeight:700,fontSize:14,cursor:ghInput.trim()?"pointer":"not-allowed",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><span style={{fontSize:16}}>🐙</span>Analyse GitHub Profile</button></Card></div>);
  if(phase==="loading")return(<div style={{textAlign:"center",padding:"70px 0"}}><div style={{width:52,height:52,borderRadius:99,background:T.githubLight,border:`2px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",fontSize:22,animation:"spin 1.3s linear infinite"}}>🐙</div><div style={{fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:900,color:T.text,marginBottom:7}}>Scanning GitHub profile...</div><div style={{color:T.blue,fontSize:12,fontFamily:"'DM Mono',monospace",marginBottom:26}}>{statusMsg}</div><div style={{maxWidth:340,margin:"0 auto",background:T.faint,borderRadius:99,height:5,overflow:"hidden"}}><div style={{width:`${progress}%`,height:"100%",background:T.github,transition:"width 0.35s ease",borderRadius:99}}/></div><div style={{marginTop:9,fontSize:12,color:T.muted,fontFamily:"'DM Mono',monospace"}}>{Math.round(progress)}%</div></div>);
  if(phase==="results"&&analysis&&ghData){const{user}=ghData;const tabs=[["overview","📊 Overview"],["repos","📦 Repos"],["languages","🗣️ Languages"],["insights","💡 Insights"]];return(<div><div style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:14,padding:"16px 20px",marginBottom:14,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>{user.avatar_url&&<img src={user.avatar_url} alt="" style={{width:52,height:52,borderRadius:99,border:`2px solid ${T.border}`}}/>}<div style={{flex:1,minWidth:180}}><div style={{fontFamily:"'Fraunces',serif",fontWeight:900,fontSize:17,color:T.text}}>{user.name||user.login}</div><div style={{fontSize:12,color:T.muted,fontFamily:"'DM Mono',monospace"}}>@{user.login}</div>{user.bio&&<div style={{fontSize:12.5,color:T.sub,marginTop:3}}>{user.bio}</div>}</div><div style={{display:"flex",gap:20,flexWrap:"wrap"}}>{[[user.public_repos,"Repos"],[ghData.repos.reduce((a,r)=>a+r.stargazers_count,0),"Stars"],[user.followers,"Followers"]].map(([v,l])=>(<div key={l} style={{textAlign:"center"}}><div style={{fontWeight:800,fontSize:18,color:T.text}}>{v}</div><div style={{fontSize:10.5,color:T.muted}}>{l}</div></div>))}</div><div style={{display:"flex",gap:12,alignItems:"center"}}><ScoreRing score={analysis.overallScore} size={72} label="Overall"/><ScoreRing score={analysis.activityScore} size={72} label="Activity"/><ScoreRing score={analysis.portfolioStrength} size={72} label="Portfolio"/></div><button onClick={reset} style={{padding:"7px 14px",border:`1.5px solid ${T.border}`,borderRadius:8,background:"#fff",color:T.muted,cursor:"pointer",fontSize:12,fontWeight:600}}>← Back</button></div><div style={{display:"flex",gap:3,background:"#fff",border:`1px solid ${T.border}`,borderRadius:11,padding:4,marginBottom:14,overflowX:"auto"}}>{tabs.map(([t,l])=>(<button key={t} onClick={()=>setActiveTab(t)} style={{flex:1,padding:"8px 12px",border:"none",borderRadius:8,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:activeTab===t?700:500,fontSize:12.5,background:activeTab===t?T.github:"transparent",color:activeTab===t?"#fff":T.muted,transition:"all 0.18s",whiteSpace:"nowrap"}}>{l}</button>))}</div>{activeTab==="overview"&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Card style={{gridColumn:"1/-1"}}><SecHead icon="🧠" title="AI Verdict"/><p style={{margin:"0 0 12px",fontSize:13.5,color:T.text,lineHeight:1.75}}>{analysis.summary}</p><div style={{padding:"12px 14px",background:analysis.overallScore>=65?T.greenLight:analysis.overallScore>=40?T.amberLight:T.redLight,borderRadius:10,fontSize:13,color:T.text,lineHeight:1.6,borderLeft:`3px solid ${scoreColor(analysis.overallScore)}`}}><strong>Hiring Verdict:</strong> {analysis.hirabilityVerdict}</div></Card><Card><SecHead icon="💪" title="Strengths" right={<Badge label={`${(analysis.strengths||[]).length}`} color={T.green} bg={T.greenLight}/>}/>{(analysis.strengths||[]).map((s,i)=>(<div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:`1px solid ${T.faint}`}}><span style={{color:T.green,flexShrink:0,fontSize:12}}>✓</span><span style={{fontSize:13,color:T.text,lineHeight:1.5}}>{s}</span></div>))}</Card><Card><SecHead icon="⚠️" title="Weaknesses" right={<Badge label={`${(analysis.weaknesses||[]).length}`} color={T.red} bg={T.redLight}/>}/>{(analysis.weaknesses||[]).map((w,i)=>(<div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:`1px solid ${T.faint}`}}><span style={{color:T.red,flexShrink:0,fontSize:12}}>✗</span><span style={{fontSize:13,color:T.text,lineHeight:1.5}}>{w}</span></div>))}</Card><Card><SecHead icon="🎯" title={`Missing for ${targetRole}`}/>{(analysis.missingForRole||[]).map((m,i)=>(<div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:`1px solid ${T.faint}`}}><span style={{color:T.amber,flexShrink:0}}>→</span><span style={{fontSize:13,color:T.text}}>{m}</span></div>))}</Card><Card><SecHead icon="🚀" title="Standout Projects"/>{(analysis.standoutProjects||[]).length===0?<div style={{fontSize:13,color:T.muted}}>No standout projects detected yet.</div>:(analysis.standoutProjects||[]).map((p,i)=>(<div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:`1px solid ${T.faint}`}}><span style={{color:T.purple,flexShrink:0}}>★</span><span style={{fontSize:13,fontWeight:600,color:T.text}}>{p}</span></div>))}</Card><Card style={{gridColumn:"1/-1"}}><SecHead icon="⚡" title="Recommendations"/><div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>{(analysis.recommendations||[]).map((r,i)=>(<div key={i} style={{padding:"11px 13px",background:T.blueLight,border:`1px solid ${T.blue}20`,borderRadius:10,fontSize:12.5,color:T.text,lineHeight:1.5}}><div style={{color:T.blue,fontWeight:800,fontSize:11,marginBottom:4}}>{i+1}.</div><div>{r}</div></div>))}</div></Card></div>)}{activeTab==="repos"&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Card style={{gridColumn:"1/-1",display:"flex",gap:24,flexWrap:"wrap"}}>{[["📦","Total Repos",ghData.repos.length],["⭐","Total Stars",ghData.repos.reduce((a,r)=>a+r.stargazers_count,0)],["🍴","Total Forks",ghData.repos.reduce((a,r)=>a+r.forks_count,0)],["📝","With Description",ghData.repos.filter(r=>r.description).length]].map(([ic,l,v])=>(<div key={l} style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>{ic}</span><div><div style={{fontWeight:800,fontSize:18,color:T.text}}>{v}</div><div style={{fontSize:10.5,color:T.muted}}>{l}</div></div></div>))}</Card>{(analysis.repoAnalysis||[]).slice(0,12).map((repo,i)=>{const ghRepo=ghData.repos.find(r=>r.name===repo.name);return(<Card key={i}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}><div><div style={{fontWeight:700,fontSize:13.5,color:T.text,marginBottom:3,fontFamily:"'DM Mono',monospace"}}>{repo.name}</div>{ghRepo?.description&&<div style={{fontSize:11.5,color:T.muted,lineHeight:1.4}}>{ghRepo.description}</div>}</div><div style={{textAlign:"right",flexShrink:0,marginLeft:8}}><div style={{fontSize:16,fontWeight:800,color:scoreColor(repo.complexityScore*10)}}>{repo.complexityScore}/10</div><div style={{fontSize:9.5,color:T.muted}}>complexity</div></div></div><div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>{ghRepo?.language&&<Chip color={getLangColor(ghRepo.language)} bg={getLangColor(ghRepo.language)+"22"} mono>{ghRepo.language}</Chip>}{ghRepo?.stargazers_count>0&&<Chip color={T.amber} bg={T.amberLight}>⭐ {ghRepo.stargazers_count}</Chip>}{(repo.tags||[]).slice(0,2).map(t=><Chip key={t} color={T.purple} bg={T.purpleLight}>{t}</Chip>)}</div><div style={{marginBottom:8}}><div style={{fontSize:10.5,color:T.muted,marginBottom:3}}>Impressiveness</div><MiniBar value={repo.impressiveness} max={10} color={scoreColor(repo.impressiveness*10)}/></div><p style={{margin:0,fontSize:12,color:T.sub,lineHeight:1.5}}>{repo.feedback}</p></Card>);})}</div>)}{activeTab==="languages"&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Card style={{gridColumn:"1/-1"}}><SecHead icon="🗣️" title="Language Distribution"/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 32px"}}>{topLangs.map(({name,pct})=><LangBar key={name} name={name} percentage={pct} color={getLangColor(name)}/>)}</div></Card><Card><SecHead icon="📊" title="AI Language Assessment"/>{(analysis.topLanguages||[]).map((l,i)=>{const lvlColor=l.level==="Advanced"?T.green:l.level==="Intermediate"?T.amber:T.muted;return(<div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.faint}`}}><div style={{display:"flex",alignItems:"center",gap:9}}><div style={{width:10,height:10,borderRadius:99,background:getLangColor(l.name)}}/><span style={{fontWeight:600,fontSize:13}}>{l.name}</span></div><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:T.muted}}>{l.percentage}%</span><Badge label={l.level} color={lvlColor} bg={lvlColor+"18"}/></div></div>);})}</Card><Card><SecHead icon="📈" title="Commit Activity"/><div style={{padding:"14px",background:T.faint,borderRadius:10,marginBottom:12}}><div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:4}}>{analysis.commitPatterns?.assessment==="consistent"?"🟢":"🟡"} {analysis.commitPatterns?.assessment} Activity</div><div style={{fontSize:12.5,color:T.sub,lineHeight:1.55}}>{analysis.commitPatterns?.note}</div></div></Card></div>)}{activeTab==="insights"&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Card style={{display:"flex",flexDirection:"column",gap:14}}><SecHead icon="🎯" title="Score Breakdown"/>{[["Overall Score",analysis.overallScore],["Profile Completeness",analysis.profileCompleteness],["Activity Score",analysis.activityScore],["Code Quality",analysis.codeQualityScore],["Portfolio Strength",analysis.portfolioStrength]].map(([label,val])=>(<div key={label}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12.5,color:T.sub,fontWeight:500}}>{label}</span><Badge label={`${val} – ${scoreLabel(val)}`} color={scoreColor(val)} bg={scoreBg(val)}/></div><MiniBar value={val} max={100} color={scoreColor(val)}/></div>))}</Card><Card><SecHead icon="💡" title="Improvement Recommendations"/><div style={{display:"flex",flexDirection:"column",gap:9}}>{(analysis.recommendations||[]).map((r,i)=>(<div key={i} style={{display:"flex",gap:10,padding:"10px 12px",background:T.faint,borderRadius:9,alignItems:"flex-start"}}><span style={{width:20,height:20,borderRadius:99,background:T.blue,color:"#fff",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{i+1}</span><span style={{fontSize:12.5,color:T.text,lineHeight:1.55}}>{r}</span></div>))}</div></Card><Card style={{gridColumn:"1/-1"}}><SecHead icon="🏆" title="Final Hireability Assessment"/><p style={{margin:0,fontSize:14,color:T.text,lineHeight:1.8}}>{analysis.hirabilityVerdict}</p></Card></div>)}</div>);}
  return null;
}

/* ═══════════════════════════════════════════════════════════
   RESUME ANALYZER
═══════════════════════════════════════════════════════════ */
function ResumeAnalyzer() {
  const [phase,setPhase]=useState("setup");const [inputMode,setInputMode]=useState("file");const [file,setFile]=useState(null);const [pasteText,setPasteText]=useState("");const [jobDesc,setJobDesc]=useState("");const [expLevel,setExpLevel]=useState("fresher");const [companyType,setCompanyType]=useState("product");const [analysis,setAnalysis]=useState(null);const [resumeText,setResumeText]=useState("");const [error,setError]=useState(null);const [progress,setProgress]=useState(0);const [statusMsg,setStatusMsg]=useState("");const [dragOver,setDragOver]=useState(false);const [activeTab,setActiveTab]=useState("overview");const fileRef=useRef();
  const handleFile=f=>{setError(null);if(!f)return;if(f.type!=="application/pdf"){setError("Only PDF files are supported.");return;}setFile(f);};
  const canAnalyze=(inputMode==="file"?!!file:pasteText.trim().length>80)&&jobDesc.trim().length>10;
  const handleAnalyze=async()=>{if(!canAnalyze)return;setPhase("loading");setProgress(0);setError(null);const tick=setInterval(()=>setProgress(p=>Math.min(p+Math.random()*4,58)),250);let tick2=null;try{let rText="";if(inputMode==="file"){setStatusMsg("Reading your PDF...");rText=await extractTextFromPDF(file);}else{rText=pasteText.trim();}setResumeText(rText);clearInterval(tick);setProgress(65);setStatusMsg("AI analyzing resume against job description...");tick2=setInterval(()=>setProgress(p=>Math.min(p+Math.random()*3,93)),350);const result=await analyzeResume(rText,jobDesc,expLevel,companyType);clearInterval(tick2);setProgress(100);setTimeout(()=>{setAnalysis(result);setPhase("results");setActiveTab("overview");},400);}catch(e){clearInterval(tick);if(tick2)clearInterval(tick2);setError(e.message||"Something went wrong.");setPhase("setup");}};
  const reset=()=>{setPhase("setup");setFile(null);setPasteText("");setAnalysis(null);setResumeText("");setError(null);setJobDesc("");setProgress(0);};
  const scoreColor2=s=>s>=75?T.green:s>=50?T.amber:T.red;

  if(phase==="setup")return(<div><div style={{textAlign:"center",marginBottom:24}}><div style={{fontFamily:"'Fraunces',serif",fontSize:"clamp(22px,4vw,36px)",fontWeight:900,lineHeight:1.15,color:T.text,marginBottom:8}}>Get your ATS score &amp; <span style={{color:T.blue,fontStyle:"italic"}}>honest feedback</span></div><p style={{color:T.muted,fontSize:13.5,maxWidth:460,margin:"0 auto",lineHeight:1.6}}>Paste a job description, upload your resume, select your target company — get deep analysis in seconds.</p></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><div style={{display:"flex",flexDirection:"column",gap:12}}><Card><SecHead icon="📋" title="Job Description / Target Role"/><textarea value={jobDesc} onChange={e=>setJobDesc(e.target.value)} placeholder={"Paste the job description or describe your target role..."} style={{width:"100%",minHeight:148,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"10px 12px",fontSize:12.5,lineHeight:1.6,color:T.text,background:T.faint,boxSizing:"border-box",outline:"none",fontFamily:"'DM Mono',monospace"}} onFocus={e=>e.target.style.borderColor=T.blue} onBlur={e=>e.target.style.borderColor=T.border}/></Card><Card><SecHead icon="🎓" title="Experience Level"/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>{EXP_LEVELS.map(e=>(<button key={e.id} onClick={()=>setExpLevel(e.id)} style={{padding:"9px 12px",borderRadius:9,border:`1.5px solid ${expLevel===e.id?T.blue:T.border}`,background:expLevel===e.id?T.blueLight:"#fff",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textAlign:"left",transition:"all 0.18s"}}><div style={{fontWeight:700,fontSize:12.5,color:expLevel===e.id?T.blue:T.text}}>{e.label}</div><div style={{fontSize:10.5,color:T.muted}}>{e.desc}</div></button>))}</div></Card></div><div style={{display:"flex",flexDirection:"column",gap:12}}><Card><SecHead icon="🏢" title="Target Company Type"/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>{COMPANY_TYPES.map(c=>(<button key={c.id} onClick={()=>setCompanyType(c.id)} style={{padding:"9px 12px",borderRadius:9,border:`1.5px solid ${companyType===c.id?T.blue:T.border}`,background:companyType===c.id?T.blueLight:"#fff",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textAlign:"left",transition:"all 0.18s"}}><div style={{fontSize:15,marginBottom:2}}>{c.icon}</div><div style={{fontWeight:700,fontSize:12,color:companyType===c.id?T.blue:T.text}}>{c.label}</div><div style={{fontSize:10,color:T.muted,lineHeight:1.3}}>{c.desc}</div></button>))}</div></Card><Card><SecHead icon="📎" title="Your Resume"/><div style={{display:"flex",gap:0,background:T.faint,borderRadius:8,padding:3,marginBottom:11}}>{[["file","📂 Upload PDF"],["paste","📋 Paste Text"]].map(([m,l])=>(<button key={m} onClick={()=>{setInputMode(m);setError(null);}} style={{flex:1,padding:"7px 0",border:"none",borderRadius:6,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:m===inputMode?700:500,fontSize:12.5,background:m===inputMode?"#fff":"transparent",color:m===inputMode?T.blue:T.muted,boxShadow:m===inputMode?"0 1px 4px rgba(0,0,0,0.08)":"none",transition:"all 0.18s"}}>{l}</button>))}</div>{inputMode==="file"?(<><input ref={fileRef} type="file" accept=".pdf,application/pdf" onChange={e=>handleFile(e.target.files[0])} style={{display:"none"}}/><div onClick={()=>fileRef.current.click()} onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0]);}} style={{border:`2px dashed ${file?T.green:dragOver?T.blue:T.border}`,borderStyle:file?"solid":"dashed",borderRadius:12,padding:"22px 16px",textAlign:"center",cursor:"pointer",background:file?T.greenLight:dragOver?T.blueLight:T.faint,transition:"all 0.2s"}}><div style={{fontSize:26,marginBottom:7}}>{file?"✅":"📂"}</div>{file?(<><div style={{fontWeight:700,color:T.green,fontSize:13}}>{file.name}</div><div style={{fontSize:11,color:T.muted,marginTop:2}}>{(file.size/1024).toFixed(1)} KB · Click to change</div></>):(<><div style={{fontWeight:700,color:T.text,fontSize:13}}>Click to open File Manager</div><div style={{fontSize:11,color:T.muted,marginTop:2}}>or drag & drop · PDF only</div></>)}</div></>):(<textarea value={pasteText} onChange={e=>setPasteText(e.target.value)} placeholder="Paste your resume text here..." style={{width:"100%",minHeight:116,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"10px 12px",fontSize:12,lineHeight:1.6,color:T.text,background:T.faint,boxSizing:"border-box",outline:"none",fontFamily:"'DM Mono',monospace"}} onFocus={e=>e.target.style.borderColor=T.blue} onBlur={e=>e.target.style.borderColor=T.border}/>)}</Card></div></div>{error&&<div style={{marginTop:12,padding:"11px 14px",background:T.redLight,border:`1px solid ${T.red}22`,borderRadius:10,color:T.red,fontSize:13,display:"flex",gap:8}}><span>⚠️</span><span>{error}</span></div>}<button onClick={handleAnalyze} disabled={!canAnalyze} style={{marginTop:16,width:"100%",padding:"15px",borderRadius:11,border:"none",background:canAnalyze?T.blue:"#C8CDD8",color:"#fff",fontWeight:700,fontSize:14.5,cursor:canAnalyze?"pointer":"not-allowed",fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s"}}>{canAnalyze?"⚡  Analyse Resume":"Fill in job description + upload resume to continue"}</button></div>);

  if(phase==="loading")return(<div style={{textAlign:"center",padding:"70px 0"}}><div style={{width:52,height:52,borderRadius:99,background:T.blueLight,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",fontSize:22,animation:"spin 1.2s linear infinite"}}>⚡</div><div style={{fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:900,color:T.text,marginBottom:7}}>Analysing your resume...</div><div style={{color:T.blue,fontSize:12,fontFamily:"'DM Mono',monospace",marginBottom:26}}>{statusMsg}</div><div style={{maxWidth:340,margin:"0 auto",background:T.faint,borderRadius:99,height:5,overflow:"hidden"}}><div style={{width:`${progress}%`,height:"100%",background:`linear-gradient(90deg,${T.blue},${T.purple})`,transition:"width 0.35s ease",borderRadius:99}}/></div><div style={{marginTop:9,fontSize:12,color:T.blue,fontFamily:"'DM Mono',monospace"}}>{Math.round(progress)}%</div></div>);

  if(phase==="results"&&analysis){
    const RTABS=[["overview","📊 Overview"],["sections","📑 Sections"],["ats","🤖 ATS"],["jd","🎯 JD Match"],["company","🏢 Company"],["rewrites","✍️ Rewrites"],["resume","📄 Optimised Resume"]];
    return(<div><div style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:14,padding:"16px 20px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}><div><div style={{fontFamily:"'Fraunces',serif",fontWeight:900,fontSize:17,color:T.text}}>Resume Analysis</div><div style={{fontSize:12,color:T.muted,marginTop:3}}><span style={{background:T.blueLight,color:T.blue,padding:"1px 9px",borderRadius:99,fontWeight:600,marginRight:6}}>{analysis.detectedRole}</span><span style={{background:T.faint,color:T.muted,padding:"1px 9px",borderRadius:99}}>{COMPANY_TYPES.find(c=>c.id===companyType)?.label}</span></div></div><div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"center"}}><ScoreRing score={analysis.atsScore} size={74} label="ATS Score"/><ScoreRing score={analysis.atsCompatibility?.score||0} size={74} label="ATS Compat."/><ScoreRing score={analysis.jobDescriptionMatch?.matchScore||0} size={74} label="JD Match"/><ScoreRing score={analysis.companyFitAnalysis?.fitScore||0} size={74} label="Company Fit"/></div><button onClick={reset} style={{padding:"7px 14px",border:`1.5px solid ${T.border}`,borderRadius:8,background:"#fff",color:T.muted,cursor:"pointer",fontSize:12,fontWeight:600}}>← New</button></div>
    <div style={{display:"flex",gap:3,background:"#fff",border:`1px solid ${T.border}`,borderRadius:11,padding:4,marginBottom:14,overflowX:"auto"}}>{RTABS.map(([t,l])=>(<button key={t} onClick={()=>setActiveTab(t)} style={{flex:1,padding:"8px 10px",border:"none",borderRadius:8,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:activeTab===t?700:500,fontSize:12.5,background:activeTab===t?T.blue:"transparent",color:activeTab===t?"#fff":T.muted,transition:"all 0.18s",whiteSpace:"nowrap"}}>{l}</button>))}</div>
    {activeTab==="overview"&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Card><SecHead icon="⚠️" title="Critical Issues" right={<Badge label={`${(analysis.problems||[]).length}`} color={T.red} bg={T.redLight}/>}/>{(analysis.problems||[]).map((p,i)=>(<div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:`1px solid ${T.faint}`}}><span style={{color:T.red,flexShrink:0,fontSize:11}}>✗</span><span style={{fontSize:13,color:T.text,lineHeight:1.5}}>{p}</span></div>))}</Card><Card><SecHead icon="✅" title="Strengths" right={<Badge label={`${(analysis.strengths||[]).length}`} color={T.green} bg={T.greenLight}/>}/>{(analysis.strengths||[]).map((s,i)=>(<div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:`1px solid ${T.faint}`}}><span style={{color:T.green,flexShrink:0,fontSize:11}}>✓</span><span style={{fontSize:13,color:T.text,lineHeight:1.5}}>{s}</span></div>))}</Card><Card style={{gridColumn:"1/-1"}}><SecHead icon="⚡" title="Quick Wins"/><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>{(analysis.quickWins||[]).map((w,i)=>(<div key={i} style={{background:T.amberLight,border:`1px solid ${T.amber}22`,borderRadius:10,padding:"11px 12px",fontSize:12.5,color:T.text,lineHeight:1.5}}><div style={{color:T.amber,fontWeight:800,fontSize:11,marginBottom:4}}>{i+1}.</div><div>{w}</div></div>))}</div></Card><Card style={{gridColumn:"1/-1",background:`linear-gradient(135deg,${T.blueLight},${T.purpleLight})`,border:`1px solid ${T.blue}22`}}><SecHead icon="💬" title="Mentor's Verdict"/><p style={{margin:0,fontSize:14,color:T.text,lineHeight:1.8}}>{analysis.overallFeedback}</p></Card></div>)}
    {activeTab==="sections"&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>{analysis.sectionScores&&Object.entries(analysis.sectionScores).map(([key,sec])=>{const icons={contact:"📧",summary:"📝",experience:"💼",education:"🎓",skills:"🛠️",projects:"🚀",certifications:"🏅"};const isFresherExp=key==="experience"&&!sec.hasExperience;const col=isFresherExp?T.muted:scoreColor2(sec.score*10);return(<Card key={key}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}><div style={{display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:17}}>{icons[key]||"📄"}</span><span style={{fontWeight:700,fontSize:13.5,textTransform:"capitalize"}}>{key}</span></div><div><span style={{fontSize:19,fontWeight:800,color:col}}>{isFresherExp?0:sec.score}</span><span style={{fontSize:11,color:T.muted}}>/10</span></div></div><MiniBar value={isFresherExp?0:sec.score} max={10} color={isFresherExp?"#D1D5DB":col}/>{isFresherExp&&<div style={{marginTop:9,padding:"8px 10px",background:T.faint,borderRadius:8,fontSize:12,color:T.muted}}>No work experience detected. Focus on projects and skills.</div>}<p style={{margin:"9px 0 0",fontSize:12.5,color:T.sub,lineHeight:1.55}}>{sec.feedback}</p>{sec.missing?.length>0&&<div style={{marginTop:8}}>{sec.missing.map(m=><Chip key={m} color={T.red} bg={T.redLight}>{m}</Chip>)}</div>}</Card>);})}</div>)}
    {activeTab==="ats"&&analysis.atsCompatibility&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Card style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:28,gap:6}}><ScoreRing score={analysis.atsCompatibility.score} size={96}/><div style={{fontWeight:700,fontSize:13.5,color:scoreColor2(analysis.atsCompatibility.score),marginTop:5}}>{scoreLabel(analysis.atsCompatibility.score)} ATS Compatibility</div></Card><Card><SecHead icon="🖼️" title="Photo Detection"/><div style={{padding:"13px 14px",borderRadius:10,background:analysis.atsCompatibility.hasPhoto?T.redLight:T.greenLight,border:`1px solid ${analysis.atsCompatibility.hasPhoto?T.red+"33":T.green+"33"}`,marginBottom:10}}><div style={{fontWeight:700,color:analysis.atsCompatibility.hasPhoto?T.red:T.green,fontSize:13,marginBottom:4}}>{analysis.atsCompatibility.hasPhoto?"⚠️ Photo Detected":"✅ No Photo Found"}</div><p style={{margin:0,fontSize:12.5,color:T.text,lineHeight:1.5}}>{analysis.atsCompatibility.photoNote}</p></div></Card><Card><SecHead icon="⚠️" title="Formatting Issues" right={<Badge label={`${(analysis.atsCompatibility.formattingIssues||[]).length} found`} color={(analysis.atsCompatibility.formattingIssues||[]).length>0?T.red:T.green} bg={(analysis.atsCompatibility.formattingIssues||[]).length>0?T.redLight:T.greenLight}/>}/>{(analysis.atsCompatibility.formattingIssues||[]).length===0?<div style={{padding:"11px",background:T.greenLight,borderRadius:8,fontSize:13,color:T.green,fontWeight:600}}>✅ No formatting issues</div>:(analysis.atsCompatibility.formattingIssues||[]).map((f,i)=>(<div key={i} style={{display:"flex",gap:8,padding:"8px 10px",background:T.redLight,borderRadius:8,marginBottom:6}}><span style={{color:T.red}}>▲</span><span style={{fontSize:12.5,color:T.text}}>{f}</span></div>))}</Card><Card><SecHead icon="🚫" title="ATS Cannot Read"/>{(analysis.atsCompatibility.atsUnfriendlyElements||[]).length===0?<div style={{padding:"11px",background:T.greenLight,borderRadius:8,fontSize:13,color:T.green,fontWeight:600}}>✅ No problematic elements</div>:(analysis.atsCompatibility.atsUnfriendlyElements||[]).map((e,i)=>(<div key={i} style={{display:"flex",gap:8,padding:"8px 10px",background:T.amberLight,borderRadius:8,marginBottom:6,border:`1px solid ${T.amber}22`}}><span style={{color:T.amber}}>🔶</span><span style={{fontSize:12.5,color:T.text}}>{e}</span></div>))}</Card></div>)}
    {activeTab==="jd"&&analysis.jobDescriptionMatch&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Card style={{display:"flex",flexDirection:"column",alignItems:"center",padding:28,gap:6,justifyContent:"center"}}><ScoreRing score={analysis.jobDescriptionMatch.matchScore} size={96}/><div style={{fontWeight:700,fontSize:13.5,color:scoreColor2(analysis.jobDescriptionMatch.matchScore),marginTop:5}}>JD Keyword Match</div></Card><Card><SecHead icon="✅" title="Keywords Found" right={<Badge label={`${(analysis.jobDescriptionMatch.matchedKeywords||[]).length}`} color={T.green} bg={T.greenLight}/>}/><div>{(analysis.jobDescriptionMatch.matchedKeywords||[]).map(k=><Chip key={k} color={T.green} bg={T.greenLight}>{k}</Chip>)}</div></Card><Card><SecHead icon="❌" title="Missing Keywords" right={<Badge label={`${(analysis.jobDescriptionMatch.missingKeywords||[]).length}`} color={T.red} bg={T.redLight}/>}/><div>{(analysis.jobDescriptionMatch.missingKeywords||[]).map(k=><Chip key={k} color={T.red} bg={T.redLight}>{k}</Chip>)}</div></Card><Card><SecHead icon="🗑️" title="Irrelevant Content"/>{(analysis.jobDescriptionMatch.irrelevantContent||[]).length===0?<div style={{padding:"10px",background:T.greenLight,borderRadius:8,fontSize:13,color:T.green}}>✅ All content seems relevant</div>:(analysis.jobDescriptionMatch.irrelevantContent||[]).map((c,i)=>(<div key={i} style={{padding:"8px 10px",background:T.faint,borderRadius:8,fontSize:12.5,color:T.muted,marginBottom:5}}>· {c}</div>))}</Card></div>)}
    {activeTab==="company"&&analysis.companyFitAnalysis&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Card style={{display:"flex",flexDirection:"column",alignItems:"center",padding:28,gap:6,justifyContent:"center"}}><ScoreRing score={analysis.companyFitAnalysis.fitScore} size={96}/><div style={{fontWeight:700,fontSize:13.5,color:scoreColor2(analysis.companyFitAnalysis.fitScore),marginTop:5}}>{COMPANY_TYPES.find(c=>c.id===companyType)?.label} Fit</div></Card><Card><SecHead icon="💡" title="Recommendation"/><div style={{padding:"13px",background:T.blueLight,borderRadius:10,fontSize:13.5,color:T.text,lineHeight:1.65,border:`1px solid ${T.blue}22`}}>{analysis.companyFitAnalysis.recommendation}</div></Card><Card><SecHead icon="💪" title="Your Strengths"/>{(analysis.companyFitAnalysis.strengths||[]).map((s,i)=>(<div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:`1px solid ${T.faint}`}}><span style={{color:T.green,flexShrink:0}}>✓</span><span style={{fontSize:13,color:T.text}}>{s}</span></div>))}</Card><Card><SecHead icon="📌" title="Gaps to Fill"/>{(analysis.companyFitAnalysis.gaps||[]).map((g,i)=>(<div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:`1px solid ${T.faint}`}}><span style={{color:T.amber,flexShrink:0}}>→</span><span style={{fontSize:13,color:T.text}}>{g}</span></div>))}</Card></div>)}
    {activeTab==="rewrites"&&(<div style={{display:"flex",flexDirection:"column",gap:12}}>{(analysis.bulletImprovements||[]).map((imp,i)=>(<Card key={i}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:13}}><div style={{width:22,height:22,borderRadius:99,background:T.blue,color:"#fff",fontSize:11,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{i+1}</div><span style={{fontSize:13,fontWeight:700,color:T.text}}>Bullet Improvement</span></div><div style={{marginBottom:10}}><div style={{fontSize:10,color:T.red,fontFamily:"'DM Mono',monospace",letterSpacing:0.8,textTransform:"uppercase",marginBottom:5,fontWeight:600}}>❌ Before</div><div style={{padding:"9px 13px",background:T.redLight,borderRadius:8,borderLeft:`3px solid ${T.red}`,fontSize:13,color:"#7F1D1D",lineHeight:1.55,fontStyle:"italic"}}>{imp.before}</div></div><div style={{marginBottom:10}}><div style={{fontSize:10,color:T.green,fontFamily:"'DM Mono',monospace",letterSpacing:0.8,textTransform:"uppercase",marginBottom:5,fontWeight:600}}>✅ After</div><div style={{padding:"9px 13px",background:T.greenLight,borderRadius:8,borderLeft:`3px solid ${T.green}`,fontSize:13,color:"#14532D",lineHeight:1.55}}>{imp.after}</div></div><div style={{padding:"8px 12px",background:T.faint,borderRadius:8,fontSize:12,color:T.muted,lineHeight:1.5}}><strong>Why:</strong> {imp.reason}</div></Card>))}{(!analysis.bulletImprovements||analysis.bulletImprovements.length===0)&&<Card style={{textAlign:"center",padding:32}}><div style={{fontSize:32,marginBottom:10}}>✅</div><div style={{fontWeight:700,color:T.green}}>Bullets look strong!</div></Card>}</div>)}
    {activeTab==="resume"&&(
      <OptimisedResumeTab resumeText={resumeText} jobDesc={jobDesc} expLevel={expLevel} companyType={companyType} analysis={analysis}/>
    )}
    </div>);
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════════════ */
export default function App() {
  const [user,setUser]=useState(null);const [tool,setTool]=useState("resume");
  useEffect(()=>{const link=document.createElement("link");link.rel="stylesheet";link.href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Mono:wght@400;500&family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,700&display=swap";document.head.appendChild(link);},[]);
  return(
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'DM Sans',sans-serif",color:T.text}}>
      <style>{`*{box-sizing:border-box;}@keyframes spin{to{transform:rotate(360deg);}}@keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}.fade-up{animation:fadeUp 0.35s ease both;}.fade-in{animation:fadeIn 0.3s ease both;}input:focus,select:focus{outline:none;}textarea{resize:vertical;}::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#C8CDD8;border-radius:99px;}`}</style>
      {!user?(
        <div className="fade-in"><AuthPage onLogin={setUser}/></div>
      ):(
        <div className="fade-in">
          <div style={{background:"#fff",borderBottom:`1px solid ${T.border}`,padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,height:56}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:32,height:32,borderRadius:9,background:`linear-gradient(135deg,${T.blue},${T.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>👁️</div>
              <div><div style={{fontFamily:"'Fraunces',serif",fontWeight:900,fontSize:18,letterSpacing:-0.8,color:T.text,lineHeight:1}}>CVision</div><div style={{fontSize:8.5,color:T.muted,letterSpacing:1.4,textTransform:"uppercase"}}>Career Intelligence</div></div>
            </div>
            <div style={{display:"flex",gap:3,background:T.faint,borderRadius:10,padding:3}}>
              <button onClick={()=>setTool("resume")} style={{padding:"7px 18px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,background:tool==="resume"?"#fff":"transparent",color:tool==="resume"?T.blue:T.muted,boxShadow:tool==="resume"?"0 1px 4px rgba(0,0,0,0.09)":"none",transition:"all 0.18s",display:"flex",alignItems:"center",gap:6}}><span>📄</span> Resume Analyser</button>
              <button onClick={()=>setTool("github")} style={{padding:"7px 18px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,background:tool==="github"?"#fff":"transparent",color:tool==="github"?T.github:T.muted,boxShadow:tool==="github"?"0 1px 4px rgba(0,0,0,0.09)":"none",transition:"all 0.18s",display:"flex",alignItems:"center",gap:6}}><span>🐙</span> GitHub Analyser</button>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:30,height:30,borderRadius:99,background:`linear-gradient(135deg,${T.blue},${T.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#fff",fontWeight:700}}>{(user.name||user.username)[0].toUpperCase()}</div>
                <div><div style={{fontSize:12.5,fontWeight:700,color:T.text,lineHeight:1}}>{user.name||user.username}</div><div style={{fontSize:10.5,color:T.muted}}>@{user.username}</div></div>
              </div>
              <button onClick={()=>setUser(null)} style={{padding:"6px 13px",border:`1.5px solid ${T.border}`,borderRadius:8,background:"#fff",color:T.muted,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",transition:"all 0.15s"}} onMouseEnter={e=>{e.target.style.borderColor=T.red;e.target.style.color=T.red;}} onMouseLeave={e=>{e.target.style.borderColor=T.border;e.target.style.color=T.muted;}}>Sign Out</button>
            </div>
          </div>
          <div style={{maxWidth:"100%",padding:"20px 32px 48px"}}>
            <div className="fade-up" key={tool}>{tool==="resume"?<ResumeAnalyzer/>:<GitHubAnalyzer/>}</div>
          </div>
        </div>
      )}
    </div>
  );
}