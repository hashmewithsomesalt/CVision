import { useState, useRef, useEffect } from "react";

const ROLES = ["Software Developer","Frontend Developer","Backend Developer","Full Stack Developer","Data Scientist","ML Engineer","DevOps Engineer","Product Manager","UI/UX Designer","Cybersecurity Analyst","Business Analyst","Sales Executive","HR Manager","Financial Analyst"];
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
const T = {
  bg:"#F5F6FA", surface:"#FFFFFF", border:"#E3E7EF",
  text:"#16192A", sub:"#4B5268", muted:"#8891AA", faint:"#F0F2F7",
  blue:"#2B5CE6", blueLight:"#F4F7FF",
  green:"#12A150", greenLight:"#EDF8F2",
  red:"#D63B3B", redLight:"#FEF2F2",
  amber:"#C97A0A", amberLight:"#FFFBEB",
  purple:"#6D3BE8", purpleLight:"#F3EFFE",
  github:"#24292F", githubLight:"#F6F8FA",
};

/* ─── PDF ─── */
async function extractTextFromPDF(file) {
  if (!window.pdfjsLib) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = res; s.onerror = () => rej(new Error("Failed to load PDF reader."));
      document.head.appendChild(s);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const c = await page.getTextContent();
    text += c.items.map(x => x.str).join(" ") + "\n";
  }
  if (!text.trim() || text.trim().length < 30)
    throw new Error("Couldn't extract text — try the Paste Text option instead.");
  return text.trim();
}

/* ─── GitHub ─── */
function parseGHInput(raw) {
  const s = raw.trim().replace(/^@/, "");
  const m = s.match(/github\.com\/([A-Za-z0-9_.-]+)/i);
  return m ? m[1] : s;
}

async function ghFetch(path, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.github.com${path}`, {
      signal: controller.signal,
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    if (e.name === "AbortError") throw new Error("GitHub request timed out. Check your internet connection and try again.");
    throw new Error("Could not reach GitHub. Check your internet connection.");
  }
}

async function fetchGitHubData(rawInput) {
  const username = parseGHInput(rawInput);
  if (!username) throw new Error("Please enter a valid GitHub username or URL.");

  // Fetch user profile
  const uRes = await ghFetch(`/users/${username}`);
  if (!uRes.ok) {
    if (uRes.status === 404) throw new Error(`GitHub user "${username}" not found. Check the username and try again.`);
    if (uRes.status === 403) {
      const remaining = uRes.headers.get("X-RateLimit-Remaining");
      if (remaining === "0") {
        const reset = uRes.headers.get("X-RateLimit-Reset");
        const mins = reset ? Math.ceil((Number(reset)*1000 - Date.now()) / 60000) : "a few";
        throw new Error(`GitHub rate limit reached. Please wait ${mins} minute(s) and try again.`);
      }
      throw new Error("GitHub access denied (403). You may have hit the rate limit — try again in a minute.");
    }
    if (uRes.status === 401) throw new Error("GitHub authentication error (401). Try again.");
    throw new Error(`GitHub returned an error (${uRes.status}). Please try again.`);
  }
  const user = await uRes.json();

  // Fetch repos (non-fatal if it fails)
  let repos = [];
  try {
    const rRes = await ghFetch(`/users/${username}/repos?per_page=100&sort=updated&type=owner`);
    if (rRes.ok) {
      const data = await rRes.json();
      repos = Array.isArray(data) ? data.filter(r => !r.fork) : [];
    }
  } catch (_) { repos = []; }

  // Fetch languages for top repos (non-fatal, best-effort)
  const langMap = {};
  await Promise.allSettled(
    repos.slice(0, 6).map(async r => {
      try {
        const lr = await ghFetch(`/repos/${username}/${r.name}/languages`, 5000);
        if (lr.ok) {
          const data = await lr.json();
          Object.entries(data).forEach(([l, b]) => { langMap[l] = (langMap[l]||0) + b; });
        }
      } catch (_) {}
    })
  );

  return { user, repos, langMap };
}

/* ─── AI ─── */
function clip(t, max) {
  return String(t||"").replace(/[\u0000-\u0008\u000B\u000E-\u001F]/g,"").replace(/[\r\n]+/g," ").trim().slice(0, max);
}

async function callClaude(system, user, maxTokens=1200) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system,
      messages: [{ role:"user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const d = await res.json();
  return (d.content?.[0]?.text || "").trim();
}

/* ─── XML tag parser — zero JSON involved ─── */
function tag(text, name, fallback="") {
  const m = text.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, "i"));
  return m ? m[1].trim() : fallback;
}
function tagList(text, name) {
  const raw = tag(text, name, "");
  if (!raw) return [];
  return raw.split(/\n|,/).map(s => s.replace(/^[-•*\d.]+\s*/,"").trim()).filter(Boolean);
}
function tagNum(text, name, fallback=50) {
  const raw = tag(text, name, "");
  const n = parseInt(raw);
  return isNaN(n) ? fallback : Math.min(100, Math.max(0, n));
}
function tagNum10(text, name, fallback=5) {
  const raw = tag(text, name, "");
  const n = parseInt(raw);
  return isNaN(n) ? fallback : Math.min(10, Math.max(0, n));
}

/* ─── Resume Analysis (XML response, no JSON) ─── */
async function analyzeResume(resumeText, jobDesc, expLevel, companyType) {
  const resume = clip(resumeText, 4000);
  const jd     = clip(jobDesc, 1000);

  const system = `You are an expert ATS resume analyzer.
Always respond using ONLY the XML tags requested. No JSON. No markdown. No extra explanation.`;

  const prompt = `Analyze this resume.

RESUME: ${resume}
JOB DESCRIPTION: ${jd}
EXPERIENCE LEVEL: ${expLevel}
COMPANY TYPE: ${companyType}

Reply using ONLY these XML tags, nothing else:

<detectedRole>Full Stack Developer</detectedRole>
<atsScore>72</atsScore>
<atsCompatScore>68</atsCompatScore>
<hasPhoto>false</hasPhoto>
<photoNote>No photo detected, which is ATS-friendly</photoNote>
<jdMatchScore>65</jdMatchScore>
<companyFitScore>70</companyFitScore>
<matchedKeywords>React, Node.js, MongoDB</matchedKeywords>
<missingKeywords>Docker, AWS, Kubernetes</missingKeywords>
<formattingIssues>Uses tables which ATS cannot parse
Inconsistent bullet formatting</formattingIssues>
<goodPractices>Standard section headers
Clean single-column layout</goodPractices>
<problems>Missing quantified achievements
No professional summary
Skills section lacks organization</problems>
<strengths>Strong technical skills listed
Good project section with variety</strengths>
<quickWins>Add a professional summary at top
Quantify all achievements with numbers
Add missing keywords from job description</quickWins>
<overallFeedback>This is a solid resume with good fundamentals but needs ATS optimization. The technical skills are relevant but need better presentation and quantified results to stand out.</overallFeedback>
<companyRecommendation>Focus on scalability and system design for product companies</companyRecommendation>
<companyStrengths>Good project portfolio
Strong academic background</companyStrengths>
<companyGaps>No open source contributions
Missing system design experience</companyGaps>
<contactScore>8</contactScore>
<summaryScore>3</summaryScore>
<experienceScore>6</experienceScore>
<educationScore>8</educationScore>
<skillsScore>7</skillsScore>
<projectsScore>6</projectsScore>
<certificationsScore>4</certificationsScore>
<hasExperience>true</hasExperience>
<contactFeedback>Contact section is complete with all required fields</contactFeedback>
<summaryFeedback>No professional summary found - this is a major ATS gap</summaryFeedback>
<experienceFeedback>Work experience is present but lacks quantified metrics</experienceFeedback>
<educationFeedback>Education details are well presented</educationFeedback>
<skillsFeedback>Skills section exists but could be better organized by category</skillsFeedback>
<projectsFeedback>Projects are relevant but descriptions lack impact metrics</projectsFeedback>
<certificationsFeedback>No certifications listed - consider adding relevant ones</certificationsFeedback>
<bulletBefore>Worked on React components for the frontend</bulletBefore>
<bulletAfter>Built 15 reusable React components reducing frontend development time by 35%</bulletAfter>
<bulletReason>Added specific metric, strong action verb, and measurable impact</bulletReason>`;

  const raw = await callClaude(system, prompt, 1400);

  const hasExp = tag(raw,"hasExperience","true").toLowerCase() !== "false";
  return {
    detectedRole: tag(raw,"detectedRole","Software Developer"),
    atsScore: tagNum(raw,"atsScore",60),
    atsCompatibility: {
      score: tagNum(raw,"atsCompatScore",60),
      hasPhoto: tag(raw,"hasPhoto","false").toLowerCase()==="true",
      photoNote: tag(raw,"photoNote","Could not determine photo presence"),
      formattingIssues: tagList(raw,"formattingIssues"),
      atsUnfriendlyElements: [],
      goodPractices: tagList(raw,"goodPractices"),
    },
    jobDescriptionMatch: {
      matchScore: tagNum(raw,"jdMatchScore",60),
      matchedKeywords: tagList(raw,"matchedKeywords"),
      missingKeywords: tagList(raw,"missingKeywords"),
      relevantSkillsFound: tagList(raw,"matchedKeywords"),
      irrelevantContent: [],
    },
    companyFitAnalysis: {
      fitScore: tagNum(raw,"companyFitScore",60),
      strengths: tagList(raw,"companyStrengths"),
      gaps: tagList(raw,"companyGaps"),
      recommendation: tag(raw,"companyRecommendation","Focus on skills relevant to this company."),
    },
    sectionScores: {
      contact: { score: tagNum10(raw,"contactScore",7), feedback: tag(raw,"contactFeedback",""), missing:[] },
      summary: { score: tagNum10(raw,"summaryScore",4), feedback: tag(raw,"summaryFeedback",""), missing:[] },
      experience: { score: tagNum10(raw,"experienceScore",6), feedback: tag(raw,"experienceFeedback",""), hasExperience: hasExp },
      education: { score: tagNum10(raw,"educationScore",7), feedback: tag(raw,"educationFeedback",""), missing:[] },
      skills: { score: tagNum10(raw,"skillsScore",6), feedback: tag(raw,"skillsFeedback",""), missing:[] },
      projects: { score: tagNum10(raw,"projectsScore",6), feedback: tag(raw,"projectsFeedback",""), missing:[] },
      certifications: { score: tagNum10(raw,"certificationsScore",3), feedback: tag(raw,"certificationsFeedback","") },
    },
    bulletImprovements: tag(raw,"bulletBefore") ? [{
      before: tag(raw,"bulletBefore",""),
      after: tag(raw,"bulletAfter",""),
      reason: tag(raw,"bulletReason",""),
    }] : [],
    problems: tagList(raw,"problems"),
    strengths: tagList(raw,"strengths"),
    quickWins: tagList(raw,"quickWins"),
    overallFeedback: tag(raw,"overallFeedback","Analysis complete."),
  };
}

async function generateOptimizedResume(resumeText, jobDesc, expLevel, companyType, analysis) {
  const resume = clip(resumeText, 4000);
  const jd     = clip(jobDesc, 800);
  const missing = (analysis.jobDescriptionMatch?.missingKeywords||[]).slice(0,8).join(", ");
  return callClaude(
    "You are an expert resume writer. Return ONLY the plain-text resume. No JSON, no XML, no markdown, no explanation.",
    `Rewrite this resume to be fully ATS-optimized.
RESUME: ${resume}
JOB DESC: ${jd}
LEVEL: ${expLevel} | COMPANY: ${companyType}
ADD KEYWORDS: ${missing}
Rules: Use headers CONTACT/SUMMARY/SKILLS/EXPERIENCE/EDUCATION/PROJECTS/CERTIFICATIONS. Action verb+metric on every bullet. Dashes only. Do NOT invent facts.`,
    2000
  );
}

/* ─── GitHub Analysis (XML) ─── */
async function analyzeGitHub(ghData, targetRole) {
  const { user, repos, langMap } = ghData;
  const repoLines = repos.slice(0,8).map((r,i)=>`${i+1}. ${r.name} | ${r.language||"?"} | ⭐${r.stargazers_count} | ${clip(r.description||"no description",60)}`).join("\n");
  const langs = Object.entries(langMap).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([l])=>l).join(", ");

  const system = `You are a developer profile evaluator.
Always respond using ONLY the XML tags requested. No JSON. No markdown. No extra text.`;

  const prompt = `Analyze this GitHub profile for target role: ${targetRole}

USER: ${user.login} | repos: ${user.public_repos} | followers: ${user.followers}
BIO: ${clip(user.bio||"none",100)}
TOP LANGUAGES: ${langs}
REPOS:
${repoLines}

Reply using ONLY these XML tags:

<overallScore>65</overallScore>
<profileCompleteness>60</profileCompleteness>
<activityScore>55</activityScore>
<codeQualityScore>62</codeQualityScore>
<portfolioStrength>58</portfolioStrength>
<summary>Developer with a diverse portfolio showing broad technical skills</summary>
<lang1>JavaScript</lang1><lang1pct>45</lang1pct><lang1level>Intermediate</lang1level>
<lang2>Python</lang2><lang2pct>30</lang2pct><lang2level>Beginner</lang2level>
<lang3>CSS</lang3><lang3pct>25</lang3pct><lang3level>Beginner</lang3level>
<repo1name>project-alpha</repo1name><repo1complexity>6</repo1complexity><repo1impressiveness>7</repo1impressiveness><repo1feedback>Well structured with good README</repo1feedback><repo1tags>web,react</repo1tags>
<repo2name>ml-experiments</repo2name><repo2complexity>5</repo2complexity><repo2impressiveness>5</repo2impressiveness><repo2feedback>Interesting ML exploration</repo2feedback><repo2tags>python,ml</repo2tags>
<commitAssessment>sporadic</commitAssessment>
<commitNote>Commits are irregular with long gaps between activity</commitNote>
<strengths>Diverse language knowledge across frontend and backend
Active project creation showing initiative</strengths>
<weaknesses>Inconsistent commit history with long inactive gaps
Few repositories have proper documentation</weaknesses>
<missingForRole>System design examples
API development projects
Testing and CI/CD setup</missingForRole>
<standoutProjects>project-alpha</standoutProjects>
<recommendations>Add detailed README to every repository
Contribute to open source projects
Build a project showcasing full system design</recommendations>
<hirabilityVerdict>Shows solid potential with diverse skills but needs more consistent activity and better documentation to stand out to recruiters</hirabilityVerdict>
<redFlags>Several empty repositories without any code</redFlags>`;

  const raw = await callClaude(system, prompt, 1400);

  const n  = (name, fb=0)  => { const v=parseInt(tag(raw,name,"")); return isNaN(v)?fb:Math.min(100,Math.max(0,v)); };
  const n10= (name, fb=5)  => { const v=parseInt(tag(raw,name,"")); return isNaN(v)?fb:Math.min(10,Math.max(0,v)); };
  const s  = (name, fb="") => tag(raw,name,fb);

  // languages
  const topLanguages = [];
  for (let i=1;i<=6;i++) {
    const nm = s(`lang${i}`);
    if (nm) topLanguages.push({ name:nm, percentage:n(`lang${i}pct`,20), level:s(`lang${i}level`,"Beginner") });
  }
  // repos
  const repoAnalysis = [];
  for (let i=1;i<=8;i++) {
    const nm = s(`repo${i}name`);
    if (nm) repoAnalysis.push({
      name: nm,
      complexityScore: n10(`repo${i}complexity`,5),
      impressiveness: n10(`repo${i}impressiveness`,5),
      feedback: s(`repo${i}feedback`,""),
      tags: s(`repo${i}tags`,"").split(",").map(t=>t.trim()).filter(Boolean),
    });
  }

  return {
    overallScore: n("overallScore",60),
    profileCompleteness: n("profileCompleteness",55),
    activityScore: n("activityScore",50),
    codeQualityScore: n("codeQualityScore",55),
    portfolioStrength: n("portfolioStrength",55),
    summary: s("summary","GitHub profile analyzed."),
    topLanguages: topLanguages.length ? topLanguages : [{name:"Unknown",percentage:100,level:"Unknown"}],
    repoAnalysis,
    commitPatterns: { assessment:s("commitAssessment","sporadic"), note:s("commitNote","Activity analyzed.") },
    strengths: tagList(raw,"strengths"),
    weaknesses: tagList(raw,"weaknesses"),
    missingForRole: tagList(raw,"missingForRole"),
    standoutProjects: tagList(raw,"standoutProjects"),
    recommendations: tagList(raw,"recommendations"),
    hirabilityVerdict: s("hirabilityVerdict","Analysis complete."),
    redFlags: tagList(raw,"redFlags"),
  };
}

/* ─── UI helpers ─── */
const scoreColor = s => s>=75?T.green:s>=50?T.amber:T.red;
const scoreBg    = s => s>=75?T.greenLight:s>=50?T.amberLight:T.redLight;
const scoreLabel = s => s>=80?"Excellent":s>=65?"Good":s>=45?"Average":s>=25?"Needs Work":"Poor";

function ScoreRing({score=0,size=84,label}){
  const r=size/2-7, circ=2*Math.PI*r;
  const [anim,setAnim]=useState(0);
  useEffect(()=>{
    let start=null;
    const step=ts=>{if(!start)start=ts;const p=Math.min((ts-start)/850,1);setAnim(Math.round(p*score));if(p<1)requestAnimationFrame(step);};
    requestAnimationFrame(step);
  },[score]);
  const col=scoreColor(score);
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
      <div style={{position:"relative",width:size,height:size}}>
        <svg width={size} height={size} style={{position:"absolute",transform:"rotate(-90deg)"}}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E8EBF3" strokeWidth={6.5}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={6.5}
            strokeDasharray={circ} strokeDashoffset={circ-(anim/100)*circ} strokeLinecap="round"/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:size*0.22,fontWeight:800,color:col,lineHeight:1}}>{anim}</span>
          <span style={{fontSize:8.5,color:T.muted,lineHeight:1}}>/100</span>
        </div>
      </div>
      {label&&<span style={{fontSize:11,fontWeight:600,color:T.sub,textAlign:"center"}}>{label}</span>}
    </div>
  );
}
function MiniBar({value=0,max=10,color}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1,height:5,background:"#E8EBF3",borderRadius:99,overflow:"hidden"}}>
        <div style={{width:`${Math.round((value/max)*100)}%`,height:"100%",background:color,borderRadius:99,transition:"width 0.9s ease"}}/>
      </div>
      <span style={{fontSize:11.5,fontWeight:700,color,minWidth:26,textAlign:"right"}}>{value}/{max}</span>
    </div>
  );
}
function LangBar({name,percentage,color}){
  const [w,setW]=useState(0);
  useEffect(()=>{setTimeout(()=>setW(percentage),100);},[percentage]);
  return(
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:12.5,fontWeight:600,color:T.text}}>{name}</span>
        <span style={{fontSize:11,color:T.muted}}>{percentage}%</span>
      </div>
      <div style={{height:7,background:"#E8EBF3",borderRadius:99,overflow:"hidden"}}>
        <div style={{width:`${w}%`,height:"100%",background:color,borderRadius:99,transition:"width 1.1s cubic-bezier(.4,0,.2,1)"}}/>
      </div>
    </div>
  );
}
const Chip=({children,color=T.blue,bg})=><span style={{display:"inline-block",padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:600,color,background:bg||color+"18",margin:"2px 3px 2px 0"}}>{children}</span>;
const Card=({children,style={}})=><div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:"18px 20px",...style}}>{children}</div>;
const SecHead=({icon,title,right})=>(
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:15}}>{icon}</span>
      <span style={{fontWeight:700,fontSize:13.5,color:T.text}}>{title}</span>
    </div>
    {right}
  </div>
);
const Badge=({label,color=T.green,bg})=><span style={{padding:"2px 9px",borderRadius:99,fontSize:10.5,fontWeight:700,color,background:bg||color+"1A"}}>{label}</span>;
const LANG_COLORS={JavaScript:"#F7DF1E",TypeScript:"#3178C6",Python:"#3776AB",Java:"#ED8B00",Rust:"#CE422B","C++":"#00599C",Go:"#00ADD8",Swift:"#FA7343",Kotlin:"#7F52FF",Ruby:"#CC342D",PHP:"#777BB4","C#":"#239120",HTML:"#E34F26",CSS:"#1572B6",Shell:"#89E051",Vue:"#4FC08D",default:"#8891AA"};
const getLangColor=l=>LANG_COLORS[l]||LANG_COLORS.default;

/* ═══════════════════════════════════════
   GITHUB ANALYZER
═══════════════════════════════════════ */
function GitHubAnalyzer(){
  const [ghInput,setGhInput]=useState("");
  const [targetRole,setTargetRole]=useState("Software Developer");
  const [phase,setPhase]=useState("input");
  const [ghData,setGhData]=useState(null);
  const [analysis,setAnalysis]=useState(null);
  const [error,setError]=useState(null);
  const [progress,setProgress]=useState(0);
  const [statusMsg,setStatusMsg]=useState("");
  const [activeTab,setActiveTab]=useState("overview");

  const run=async()=>{
    if(!ghInput.trim())return;
    setPhase("loading");setError(null);setProgress(0);
    const t1=setInterval(()=>setProgress(p=>Math.min(p+Math.random()*5,55)),250);
    let t2=null;
    try{
      setStatusMsg("Fetching GitHub data...");
      const data=await fetchGitHubData(ghInput.trim());
      setGhData(data);clearInterval(t1);setProgress(60);
      setStatusMsg("AI analyzing profile...");
      t2=setInterval(()=>setProgress(p=>Math.min(p+Math.random()*3,93)),300);
      const result=await analyzeGitHub(data,targetRole);
      clearInterval(t2);setProgress(100);
      setTimeout(()=>{setAnalysis(result);setPhase("results");setActiveTab("overview");},400);
    }catch(e){
      clearInterval(t1);if(t2)clearInterval(t2);
      setError(e.message||"Something went wrong.");setPhase("input");
    }
  };
  const reset=()=>{setPhase("input");setGhData(null);setAnalysis(null);setError(null);setGhInput("");};

  const totalBytes=ghData?Object.values(ghData.langMap).reduce((a,b)=>a+b,0):0;
  const topLangs=ghData?Object.entries(ghData.langMap).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,bytes])=>({name,pct:Math.round((bytes/totalBytes)*100)})):[];

  if(phase==="input") return(
    <div style={{maxWidth:540,margin:"0 auto",paddingTop:16}}>
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{width:52,height:52,borderRadius:16,background:T.github,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",fontSize:24}}>🐙</div>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:26,fontWeight:900,color:T.text,marginBottom:8}}>GitHub Profile Analyser</div>
        <p style={{color:T.muted,fontSize:13.5,lineHeight:1.6,maxWidth:420,margin:"0 auto"}}>Deep analysis of repositories, languages, and developer strength.</p>
      </div>
      <Card>
        <label style={{fontSize:12,fontWeight:700,color:T.sub,letterSpacing:0.4,textTransform:"uppercase",display:"block",marginBottom:7}}>GitHub Username or URL</label>
        <input value={ghInput} onChange={e=>{setGhInput(e.target.value);setError(null);}}
          onKeyDown={e=>e.key==="Enter"&&ghInput.trim()&&run()}
          placeholder="torvalds  or  https://github.com/torvalds"
          style={{width:"100%",padding:"12px 14px",border:`1.5px solid ${T.border}`,borderRadius:10,fontSize:13.5,fontFamily:"monospace",color:T.text,background:T.faint,boxSizing:"border-box",outline:"none",marginBottom:8}}
          onFocus={e=>e.target.style.borderColor=T.blue} onBlur={e=>e.target.style.borderColor=T.border}/>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {["torvalds","gaearon","sindresorhus"].map(ex=>(
            <button key={ex} onClick={()=>{setGhInput(ex);setError(null);}}
              style={{padding:"3px 10px",borderRadius:99,border:`1px solid ${T.border}`,background:"#fff",color:T.muted,fontSize:11,cursor:"pointer",fontFamily:"monospace"}}>@{ex}</button>
          ))}
        </div>
        <label style={{fontSize:12,fontWeight:700,color:T.sub,letterSpacing:0.4,textTransform:"uppercase",display:"block",marginBottom:7}}>Target Role</label>
        <select value={targetRole} onChange={e=>setTargetRole(e.target.value)}
          style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${T.border}`,borderRadius:10,fontSize:13,color:T.text,background:"#fff",outline:"none",cursor:"pointer",marginBottom:18}}>
          {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
        </select>
        {error&&(<div style={{padding:"12px 14px",background:T.redLight,border:`1px solid ${T.red}33`,borderRadius:9,marginBottom:14}}><div style={{fontWeight:700,color:T.red,marginBottom:4}}>⚠️ Error</div><div style={{color:"#7F1D1D",fontSize:12.5,lineHeight:1.55}}>{error}</div>{error.includes("rate limit")&&<div style={{marginTop:8,fontSize:12,color:T.amber}}>💡 GitHub limits 60 requests/hr. Wait a minute and retry.</div>}{error.includes("internet")&&<div style={{marginTop:8,fontSize:12,color:T.sub}}>💡 Check your internet connection.</div>}</div>)}
        <button onClick={run} disabled={!ghInput.trim()}
          style={{width:"100%",padding:"14px",borderRadius:10,border:"none",background:ghInput.trim()?T.github:"#C8CDD8",color:"#fff",fontWeight:700,fontSize:14,cursor:ghInput.trim()?"pointer":"not-allowed"}}>
          🐙 Analyse GitHub Profile
        </button>
      </Card>
    </div>
  );

  if(phase==="loading") return(
    <div style={{textAlign:"center",padding:"70px 0"}}>
      <div style={{width:52,height:52,borderRadius:99,background:T.githubLight,border:`2px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",fontSize:22,animation:"spin 1.3s linear infinite"}}>🐙</div>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:900,color:T.text,marginBottom:7}}>Scanning profile...</div>
      <div style={{color:T.blue,fontSize:12,fontFamily:"monospace",marginBottom:26}}>{statusMsg}</div>
      <div style={{maxWidth:340,margin:"0 auto",background:T.faint,borderRadius:99,height:5,overflow:"hidden"}}>
        <div style={{width:`${progress}%`,height:"100%",background:T.github,transition:"width 0.35s ease",borderRadius:99}}/>
      </div>
    </div>
  );

  if(phase==="results"&&analysis&&ghData){
    const {user}=ghData;
    const TABS=[["overview","📊 Overview"],["repos","📦 Repos"],["languages","🗣️ Languages"],["insights","💡 Insights"]];
    return(
      <div>
        <div style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:14,padding:"16px 20px",marginBottom:14,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          {user.avatar_url&&<img src={user.avatar_url} alt="" style={{width:52,height:52,borderRadius:99,border:`2px solid ${T.border}`}}/>}
          <div style={{flex:1,minWidth:160}}>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:900,fontSize:17,color:T.text}}>{user.name||user.login}</div>
            <div style={{fontSize:12,color:T.muted,fontFamily:"monospace"}}>@{user.login}</div>
            {user.bio&&<div style={{fontSize:12.5,color:T.sub,marginTop:3}}>{user.bio}</div>}
          </div>
          <div style={{display:"flex",gap:18}}>
            {[[user.public_repos,"Repos"],[ghData.repos.reduce((a,r)=>a+r.stargazers_count,0),"Stars"],[user.followers,"Followers"]].map(([v,l])=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontWeight:800,fontSize:18,color:T.text}}>{v}</div>
                <div style={{fontSize:10.5,color:T.muted}}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}>
            <ScoreRing score={analysis.overallScore} size={68} label="Overall"/>
            <ScoreRing score={analysis.activityScore} size={68} label="Activity"/>
            <ScoreRing score={analysis.portfolioStrength} size={68} label="Portfolio"/>
          </div>
          <button onClick={reset} style={{padding:"7px 14px",border:`1.5px solid ${T.border}`,borderRadius:8,background:"#fff",color:T.muted,cursor:"pointer",fontSize:12,fontWeight:600}}>← Back</button>
        </div>
        <div style={{display:"flex",gap:3,background:"#fff",border:`1px solid ${T.border}`,borderRadius:11,padding:4,marginBottom:14,overflowX:"auto"}}>
          {TABS.map(([t,l])=>(
            <button key={t} onClick={()=>setActiveTab(t)}
              style={{flex:1,padding:"8px 12px",border:"none",borderRadius:8,cursor:"pointer",fontWeight:activeTab===t?700:500,fontSize:12.5,background:activeTab===t?T.github:"transparent",color:activeTab===t?"#fff":T.muted,whiteSpace:"nowrap"}}>{l}</button>
          ))}
        </div>

        {activeTab==="overview"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Card style={{gridColumn:"1/-1",background:`linear-gradient(135deg,${T.githubLight},#fff)`}}>
              <SecHead icon="🧠" title="AI Verdict"/>
              <p style={{margin:"0 0 12px",fontSize:13.5,color:T.text,lineHeight:1.75}}>{analysis.summary}</p>
              <div style={{padding:"12px 14px",background:scoreColor(analysis.overallScore)+"18",borderRadius:10,fontSize:13,color:T.text,borderLeft:`3px solid ${scoreColor(analysis.overallScore)}`}}>
                <strong>Hiring Verdict:</strong> {analysis.hirabilityVerdict}
              </div>
            </Card>
            <Card>
              <SecHead icon="💪" title="Strengths" right={<Badge label={analysis.strengths.length} color={T.green} bg={T.greenLight}/>}/>
              {analysis.strengths.map((s,i)=>(
                <div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:`1px solid ${T.faint}`}}>
                  <span style={{color:T.green,flexShrink:0}}>✓</span><span style={{fontSize:13,color:T.text,lineHeight:1.5}}>{s}</span>
                </div>
              ))}
            </Card>
            <Card>
              <SecHead icon="⚠️" title="Weaknesses" right={<Badge label={analysis.weaknesses.length} color={T.red} bg={T.redLight}/>}/>
              {analysis.weaknesses.map((w,i)=>(
                <div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:`1px solid ${T.faint}`}}>
                  <span style={{color:T.red,flexShrink:0}}>✗</span><span style={{fontSize:13,color:T.text,lineHeight:1.5}}>{w}</span>
                </div>
              ))}
            </Card>
            <Card>
              <SecHead icon="🎯" title={`Missing for ${targetRole}`}/>
              {analysis.missingForRole.map((m,i)=>(
                <div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:`1px solid ${T.faint}`}}>
                  <span style={{color:T.amber,flexShrink:0}}>→</span><span style={{fontSize:13,color:T.text,lineHeight:1.5}}>{m}</span>
                </div>
              ))}
            </Card>
            <Card>
              <SecHead icon="🚀" title="Standout Projects"/>
              {analysis.standoutProjects.length===0
                ?<p style={{fontSize:13,color:T.muted,margin:0}}>No standout projects detected yet.</p>
                :analysis.standoutProjects.map((p,i)=>(
                  <div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:`1px solid ${T.faint}`}}>
                    <span style={{color:T.purple,flexShrink:0}}>★</span><span style={{fontSize:13,fontWeight:600,color:T.text}}>{p}</span>
                  </div>
                ))}
            </Card>
            <Card style={{gridColumn:"1/-1"}}>
              <SecHead icon="⚡" title="Recommendations"/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
                {analysis.recommendations.map((r,i)=>(
                  <div key={i} style={{padding:"11px 13px",background:T.blueLight,border:`1px solid ${T.blue}20`,borderRadius:10,fontSize:12.5,color:T.text,lineHeight:1.5}}>
                    <div style={{color:T.blue,fontWeight:800,fontSize:11,marginBottom:4}}>{i+1}.</div>{r}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab==="repos"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {analysis.repoAnalysis.length===0
              ?<Card style={{gridColumn:"1/-1",textAlign:"center",padding:32}}><p style={{color:T.muted}}>No repo data available.</p></Card>
              :analysis.repoAnalysis.map((repo,i)=>{
                const ghRepo=ghData.repos.find(r=>r.name===repo.name);
                return(
                  <Card key={i}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:13.5,color:T.text,fontFamily:"monospace"}}>{repo.name}</div>
                        {ghRepo?.description&&<div style={{fontSize:11.5,color:T.muted,marginTop:2}}>{ghRepo.description}</div>}
                      </div>
                      <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}>
                        <div style={{fontSize:16,fontWeight:800,color:scoreColor(repo.complexityScore*10)}}>{repo.complexityScore}/10</div>
                        <div style={{fontSize:9.5,color:T.muted}}>complexity</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
                      {ghRepo?.language&&<Chip color={getLangColor(ghRepo.language)} bg={getLangColor(ghRepo.language)+"22"}>{ghRepo.language}</Chip>}
                      {ghRepo?.stargazers_count>0&&<Chip color={T.amber} bg={T.amberLight}>⭐ {ghRepo.stargazers_count}</Chip>}
                      {repo.tags.slice(0,2).map(t=><Chip key={t} color={T.purple} bg={T.purpleLight}>{t}</Chip>)}
                    </div>
                    <MiniBar value={repo.impressiveness} max={10} color={scoreColor(repo.impressiveness*10)}/>
                    <p style={{margin:"8px 0 0",fontSize:12,color:T.sub,lineHeight:1.5}}>{repo.feedback}</p>
                  </Card>
                );
              })}
          </div>
        )}

        {activeTab==="languages"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Card style={{gridColumn:"1/-1"}}>
              <SecHead icon="🗣️" title="Language Distribution"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 32px"}}>
                {topLangs.map(({name,pct})=><LangBar key={name} name={name} percentage={pct} color={getLangColor(name)}/>)}
              </div>
            </Card>
            <Card>
              <SecHead icon="📊" title="AI Language Assessment"/>
              {analysis.topLanguages.map((l,i)=>{
                const lc=l.level==="Advanced"?T.green:l.level==="Intermediate"?T.amber:T.muted;
                return(
                  <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.faint}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:9}}>
                      <div style={{width:10,height:10,borderRadius:99,background:getLangColor(l.name)}}/>
                      <span style={{fontWeight:600,fontSize:13}}>{l.name}</span>
                    </div>
                    <Badge label={l.level} color={lc} bg={lc+"18"}/>
                  </div>
                );
              })}
            </Card>
            <Card>
              <SecHead icon="📈" title="Commit Activity"/>
              <div style={{padding:"14px",background:T.faint,borderRadius:10,marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:4,textTransform:"capitalize"}}>
                  {analysis.commitPatterns.assessment==="consistent"?"🟢":"🟡"} {analysis.commitPatterns.assessment} Activity
                </div>
                <div style={{fontSize:12.5,color:T.sub,lineHeight:1.55}}>{analysis.commitPatterns.note}</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div style={{padding:"11px",background:T.blueLight,borderRadius:9,textAlign:"center"}}>
                  <div style={{fontWeight:800,fontSize:20,color:T.blue}}>{analysis.profileCompleteness}</div>
                  <div style={{fontSize:10.5,color:T.muted}}>Profile Score</div>
                </div>
                <div style={{padding:"11px",background:T.greenLight,borderRadius:9,textAlign:"center"}}>
                  <div style={{fontWeight:800,fontSize:20,color:T.green}}>{analysis.codeQualityScore}</div>
                  <div style={{fontSize:10.5,color:T.muted}}>Code Quality</div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab==="insights"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Card style={{display:"flex",flexDirection:"column",gap:14}}>
              <SecHead icon="🎯" title="Score Breakdown"/>
              {[["Overall",analysis.overallScore],["Profile",analysis.profileCompleteness],["Activity",analysis.activityScore],["Code Quality",analysis.codeQualityScore],["Portfolio",analysis.portfolioStrength]].map(([label,val])=>(
                <div key={label}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:12.5,color:T.sub}}>{label}</span>
                    <Badge label={`${val} — ${scoreLabel(val)}`} color={scoreColor(val)} bg={scoreBg(val)}/>
                  </div>
                  <MiniBar value={val} max={100} color={scoreColor(val)}/>
                </div>
              ))}
            </Card>
            <Card>
              <SecHead icon="💡" title="Recommendations"/>
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                {analysis.recommendations.map((r,i)=>(
                  <div key={i} style={{display:"flex",gap:10,padding:"10px 12px",background:T.faint,borderRadius:9}}>
                    <span style={{width:20,height:20,borderRadius:99,background:T.blue,color:"#fff",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                    <span style={{fontSize:12.5,color:T.text,lineHeight:1.55}}>{r}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card style={{gridColumn:"1/-1"}}>
              <SecHead icon="🏆" title="Final Verdict"/>
              <p style={{margin:0,fontSize:14,color:T.text,lineHeight:1.8}}>{analysis.hirabilityVerdict}</p>
            </Card>
          </div>
        )}
      </div>
    );
  }
  return null;
}

/* ═══════════════════════════════════════
   RESUME ANALYZER
═══════════════════════════════════════ */
function ResumeAnalyzer(){
  const [phase,setPhase]=useState("setup");
  const [inputMode,setInputMode]=useState("file");
  const [file,setFile]=useState(null);
  const [pasteText,setPasteText]=useState("");
  const [jobDesc,setJobDesc]=useState("");
  const [expLevel,setExpLevel]=useState("fresher");
  const [companyType,setCompanyType]=useState("product");
  const [analysis,setAnalysis]=useState(null);
  const [optimizedResume,setOptimizedResume]=useState(null);
  const [resumeText,setResumeText]=useState("");
  const [generatingResume,setGeneratingResume]=useState(false);
  const [error,setError]=useState(null);
  const [progress,setProgress]=useState(0);
  const [statusMsg,setStatusMsg]=useState("");
  const [dragOver,setDragOver]=useState(false);
  const [activeTab,setActiveTab]=useState("overview");
  const [copied,setCopied]=useState(false);
  const fileRef=useRef();

  const handleFile=f=>{
    setError(null);
    if(!f)return;
    if(f.type!=="application/pdf"){setError("Only PDF files are supported.");return;}
    setFile(f);
  };
  const canAnalyze=(inputMode==="file"?!!file:pasteText.trim().length>80)&&jobDesc.trim().length>10;

  const run=async()=>{
    if(!canAnalyze)return;
    setPhase("loading");setProgress(0);setError(null);
    const t1=setInterval(()=>setProgress(p=>Math.min(p+Math.random()*4,55)),250);
    let t2=null;
    try{
      let rText="";
      if(inputMode==="file"){setStatusMsg("Reading PDF...");rText=await extractTextFromPDF(file);}
      else rText=pasteText.trim();
      setResumeText(rText);
      clearInterval(t1);setProgress(60);
      setStatusMsg("AI analyzing resume...");
      t2=setInterval(()=>setProgress(p=>Math.min(p+Math.random()*3,93)),350);
      const result=await analyzeResume(rText,jobDesc,expLevel,companyType);
      clearInterval(t2);setProgress(100);
      setTimeout(()=>{setAnalysis(result);setPhase("results");setActiveTab("overview");},400);
    }catch(e){
      clearInterval(t1);if(t2)clearInterval(t2);
      setError(e.message||"Something went wrong.");setPhase("setup");
    }
  };
  const reset=()=>{setPhase("setup");setFile(null);setPasteText("");setAnalysis(null);setOptimizedResume(null);setResumeText("");setError(null);setJobDesc("");setProgress(0);setCopied(false);};
  const sc=s=>s>=75?T.green:s>=50?T.amber:T.red;

  if(phase==="setup") return(
    <div>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:"clamp(22px,4vw,34px)",fontWeight:900,color:T.text,marginBottom:8}}>
          Get your ATS score &amp; <span style={{color:T.blue,fontStyle:"italic"}}>honest feedback</span>
        </div>
        <p style={{color:T.muted,fontSize:13.5,maxWidth:460,margin:"0 auto",lineHeight:1.6}}>Upload your resume + paste a job description — get deep AI analysis instantly.</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Card>
            <SecHead icon="📋" title="Job Description"/>
            <textarea value={jobDesc} onChange={e=>setJobDesc(e.target.value)}
              placeholder="Paste the job description here..."
              style={{width:"100%",minHeight:148,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"10px 12px",fontSize:12.5,lineHeight:1.6,color:T.text,background:T.faint,boxSizing:"border-box",outline:"none",fontFamily:"monospace"}}
              onFocus={e=>e.target.style.borderColor=T.blue} onBlur={e=>e.target.style.borderColor=T.border}/>
            {jobDesc.trim().length>0&&<div style={{marginTop:5,fontSize:11,color:jobDesc.trim().length>10?T.green:T.amber}}>{jobDesc.trim().length>10?`✓ ${jobDesc.trim().length} chars`:"Add more detail"}</div>}
          </Card>
          <Card>
            <SecHead icon="🎓" title="Experience Level"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
              {EXP_LEVELS.map(e=>(
                <button key={e.id} onClick={()=>setExpLevel(e.id)}
                  style={{padding:"9px 12px",borderRadius:9,border:`1.5px solid ${expLevel===e.id?T.blue:T.border}`,background:expLevel===e.id?T.blueLight:"#fff",cursor:"pointer",textAlign:"left"}}>
                  <div style={{fontWeight:700,fontSize:12.5,color:expLevel===e.id?T.blue:T.text}}>{e.label}</div>
                  <div style={{fontSize:10.5,color:T.muted}}>{e.desc}</div>
                </button>
              ))}
            </div>
          </Card>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Card>
            <SecHead icon="🏢" title="Target Company"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
              {COMPANY_TYPES.map(c=>(
                <button key={c.id} onClick={()=>setCompanyType(c.id)}
                  style={{padding:"9px 12px",borderRadius:9,border:`1.5px solid ${companyType===c.id?T.blue:T.border}`,background:companyType===c.id?T.blueLight:"#fff",cursor:"pointer",textAlign:"left"}}>
                  <div style={{fontSize:15,marginBottom:2}}>{c.icon}</div>
                  <div style={{fontWeight:700,fontSize:12,color:companyType===c.id?T.blue:T.text}}>{c.label}</div>
                  <div style={{fontSize:10,color:T.muted}}>{c.desc}</div>
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <SecHead icon="📎" title="Your Resume"/>
            <div style={{display:"flex",background:T.faint,borderRadius:8,padding:3,marginBottom:11}}>
              {[["file","📂 Upload PDF"],["paste","📋 Paste Text"]].map(([m,l])=>(
                <button key={m} onClick={()=>{setInputMode(m);setError(null);}}
                  style={{flex:1,padding:"7px 0",border:"none",borderRadius:6,cursor:"pointer",fontWeight:m===inputMode?700:500,fontSize:12.5,background:m===inputMode?"#fff":"transparent",color:m===inputMode?T.blue:T.muted}}>{l}</button>
              ))}
            </div>
            {inputMode==="file"?(
              <>
                <input ref={fileRef} type="file" accept=".pdf,application/pdf" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
                <div onClick={()=>fileRef.current.click()}
                  onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
                  onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0]);}}
                  style={{border:`2px dashed ${file?T.green:dragOver?T.blue:T.border}`,borderStyle:file?"solid":"dashed",borderRadius:12,padding:"22px 16px",textAlign:"center",cursor:"pointer",background:file?T.greenLight:dragOver?T.blueLight:T.faint}}>
                  <div style={{fontSize:26,marginBottom:7}}>{file?"✅":"📂"}</div>
                  {file
                    ?<><div style={{fontWeight:700,color:T.green,fontSize:13}}>{file.name}</div><div style={{fontSize:11,color:T.muted}}>{(file.size/1024).toFixed(1)} KB · Click to change</div></>
                    :<><div style={{fontWeight:700,color:T.text,fontSize:13}}>Click to upload PDF</div><div style={{fontSize:11,color:T.muted}}>or drag &amp; drop</div></>}
                </div>
              </>
            ):(
              <div>
                <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)} placeholder="Paste your resume text here..."
                  style={{width:"100%",minHeight:116,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"10px 12px",fontSize:12,lineHeight:1.6,color:T.text,background:T.faint,boxSizing:"border-box",outline:"none",fontFamily:"monospace"}}
                  onFocus={e=>e.target.style.borderColor=T.blue} onBlur={e=>e.target.style.borderColor=T.border}/>
                {pasteText.length>0&&<div style={{fontSize:11,color:pasteText.trim().length>80?T.green:T.amber,marginTop:4}}>{pasteText.trim().length>80?`✓ ${pasteText.trim().length} chars`:`Too short (${pasteText.trim().length}/80)`}</div>}
              </div>
            )}
          </Card>
        </div>
      </div>
      {error&&<div style={{marginTop:12,padding:"11px 14px",background:T.redLight,borderRadius:10,color:T.red,fontSize:13,display:"flex",gap:8}}>⚠️ {error}</div>}
      <button onClick={run} disabled={!canAnalyze}
        style={{marginTop:16,width:"100%",padding:"15px",borderRadius:11,border:"none",background:canAnalyze?T.blue:"#C8CDD8",color:"#fff",fontWeight:700,fontSize:14.5,cursor:canAnalyze?"pointer":"not-allowed"}}>
        {canAnalyze?"⚡ Analyse Resume":"Fill in job description + upload resume to continue"}
      </button>
      <div style={{display:"flex",flexWrap:"wrap",gap:7,justifyContent:"center",marginTop:16}}>
        {["ATS Score","Section Scores","JD Match","Formatting","Company Fit","Bullet Rewrites","Quick Wins"].map(f=>(
          <span key={f} style={{padding:"3px 11px",borderRadius:99,background:"#fff",border:`1px solid ${T.border}`,fontSize:11,color:T.muted}}>✓ {f}</span>
        ))}
      </div>
    </div>
  );

  if(phase==="loading") return(
    <div style={{textAlign:"center",padding:"70px 0"}}>
      <div style={{width:52,height:52,borderRadius:99,background:T.blueLight,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",fontSize:22,animation:"spin 1.2s linear infinite"}}>⚡</div>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:900,color:T.text,marginBottom:7}}>Analysing your resume...</div>
      <div style={{color:T.blue,fontSize:12,fontFamily:"monospace",marginBottom:26}}>{statusMsg}</div>
      <div style={{maxWidth:340,margin:"0 auto",background:T.faint,borderRadius:99,height:5,overflow:"hidden"}}>
        <div style={{width:`${progress}%`,height:"100%",background:`linear-gradient(90deg,${T.blue},${T.purple})`,transition:"width 0.35s ease",borderRadius:99}}/>
      </div>
    </div>
  );

  if(phase==="results"&&analysis){
    const RTABS=[["overview","📊 Overview"],["sections","📑 Sections"],["ats","🤖 ATS"],["jd","🎯 JD Match"],["company","🏢 Company"],["rewrites","✍️ Rewrites"],["resume","📄 Optimised"]];
    return(
      <div>
        <div style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:14,padding:"16px 20px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:900,fontSize:17,color:T.text}}>Resume Analysis</div>
            <div style={{fontSize:12,color:T.muted,marginTop:3}}>
              <span style={{background:T.blueLight,color:T.blue,padding:"1px 9px",borderRadius:99,fontWeight:600,marginRight:6}}>{analysis.detectedRole}</span>
              <span style={{background:T.faint,color:T.muted,padding:"1px 9px",borderRadius:99}}>{COMPANY_TYPES.find(c=>c.id===companyType)?.label}</span>
            </div>
          </div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
            <ScoreRing score={analysis.atsScore} size={72} label="ATS Score"/>
            <ScoreRing score={analysis.atsCompatibility.score} size={72} label="ATS Compat."/>
            <ScoreRing score={analysis.jobDescriptionMatch.matchScore} size={72} label="JD Match"/>
            <ScoreRing score={analysis.companyFitAnalysis.fitScore} size={72} label="Co. Fit"/>
          </div>
          <button onClick={reset} style={{padding:"7px 14px",border:`1.5px solid ${T.border}`,borderRadius:8,background:"#fff",color:T.muted,cursor:"pointer",fontSize:12,fontWeight:600}}>← New</button>
        </div>

        <div style={{display:"flex",gap:3,background:"#fff",border:`1px solid ${T.border}`,borderRadius:11,padding:4,marginBottom:14,overflowX:"auto"}}>
          {RTABS.map(([t,l])=>(
            <button key={t} onClick={()=>setActiveTab(t)}
              style={{flex:1,padding:"8px 10px",border:"none",borderRadius:8,cursor:"pointer",fontWeight:activeTab===t?700:500,fontSize:12,background:activeTab===t?T.blue:"transparent",color:activeTab===t?"#fff":T.muted,whiteSpace:"nowrap"}}>{l}</button>
          ))}
        </div>

        {activeTab==="overview"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Card>
              <SecHead icon="⚠️" title="Critical Issues" right={<Badge label={analysis.problems.length} color={T.red} bg={T.redLight}/>}/>
              {analysis.problems.length===0
                ?<div style={{fontSize:13,color:T.green}}>✓ No critical issues</div>
                :analysis.problems.map((p,i)=>(
                  <div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:`1px solid ${T.faint}`}}>
                    <span style={{color:T.red,flexShrink:0}}>✗</span><span style={{fontSize:13,color:T.text,lineHeight:1.5}}>{p}</span>
                  </div>
                ))}
            </Card>
            <Card>
              <SecHead icon="✅" title="Strengths" right={<Badge label={analysis.strengths.length} color={T.green} bg={T.greenLight}/>}/>
              {analysis.strengths.map((s,i)=>(
                <div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:`1px solid ${T.faint}`}}>
                  <span style={{color:T.green,flexShrink:0}}>✓</span><span style={{fontSize:13,color:T.text,lineHeight:1.5}}>{s}</span>
                </div>
              ))}
            </Card>
            <Card style={{gridColumn:"1/-1"}}>
              <SecHead icon="⚡" title="Quick Wins — Fix These First"/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>
                {analysis.quickWins.map((w,i)=>(
                  <div key={i} style={{background:T.amberLight,border:`1px solid ${T.amber}22`,borderRadius:10,padding:"11px 12px",fontSize:12.5,color:T.text,lineHeight:1.5}}>
                    <div style={{color:T.amber,fontWeight:800,fontSize:11,marginBottom:4}}>{i+1}.</div>{w}
                  </div>
                ))}
              </div>
            </Card>
            <Card style={{gridColumn:"1/-1",background:`linear-gradient(135deg,${T.blueLight},${T.purpleLight})`,border:`1px solid ${T.blue}22`}}>
              <SecHead icon="💬" title="Mentor's Verdict"/>
              <p style={{margin:0,fontSize:14,color:T.text,lineHeight:1.8}}>{analysis.overallFeedback}</p>
            </Card>
          </div>
        )}

        {activeTab==="sections"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {Object.entries(analysis.sectionScores).map(([key,sec])=>{
              const icons={contact:"📧",summary:"📝",experience:"💼",education:"🎓",skills:"🛠️",projects:"🚀",certifications:"🏅"};
              const noExp=key==="experience"&&!sec.hasExperience;
              const col=noExp?T.muted:sc((sec.score||0)*10);
              return(
                <Card key={key}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <span style={{fontSize:17}}>{icons[key]||"📄"}</span>
                      <span style={{fontWeight:700,fontSize:13.5,textTransform:"capitalize"}}>{key}</span>
                    </div>
                    <div><span style={{fontSize:19,fontWeight:800,color:col}}>{noExp?0:sec.score}</span><span style={{fontSize:11,color:T.muted}}>/10</span></div>
                  </div>
                  <MiniBar value={noExp?0:sec.score} max={10} color={noExp?"#D1D5DB":col}/>
                  {noExp&&<div style={{marginTop:9,padding:"8px 10px",background:T.faint,borderRadius:8,fontSize:12,color:T.muted}}>No work experience detected. Focus on projects and skills.</div>}
                  <p style={{margin:"9px 0 0",fontSize:12.5,color:T.sub,lineHeight:1.55}}>{sec.feedback}</p>
                </Card>
              );
            })}
          </div>
        )}

        {activeTab==="ats"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Card style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:28,gap:6}}>
              <ScoreRing score={analysis.atsCompatibility.score} size={96}/>
              <div style={{fontWeight:700,fontSize:13.5,color:sc(analysis.atsCompatibility.score),marginTop:5}}>{scoreLabel(analysis.atsCompatibility.score)} ATS Compatibility</div>
            </Card>
            <Card>
              <SecHead icon="🖼️" title="Photo Detection"/>
              <div style={{padding:"13px 14px",borderRadius:10,background:analysis.atsCompatibility.hasPhoto?T.redLight:T.greenLight,border:`1px solid ${analysis.atsCompatibility.hasPhoto?T.red+"33":T.green+"33"}`}}>
                <div style={{fontWeight:700,color:analysis.atsCompatibility.hasPhoto?T.red:T.green,fontSize:13,marginBottom:4}}>
                  {analysis.atsCompatibility.hasPhoto?"⚠️ Photo Detected":"✅ No Photo Found"}
                </div>
                <p style={{margin:0,fontSize:12.5,color:T.text}}>{analysis.atsCompatibility.photoNote}</p>
              </div>
            </Card>
            <Card>
              <SecHead icon="⚠️" title="Formatting Issues"/>
              {analysis.atsCompatibility.formattingIssues.length===0
                ?<div style={{padding:"11px",background:T.greenLight,borderRadius:8,fontSize:13,color:T.green}}>✅ No formatting issues</div>
                :analysis.atsCompatibility.formattingIssues.map((f,i)=>(
                  <div key={i} style={{display:"flex",gap:8,padding:"8px 10px",background:T.redLight,borderRadius:8,marginBottom:6}}>
                    <span style={{color:T.red,flexShrink:0}}>▲</span><span style={{fontSize:12.5,color:T.text}}>{f}</span>
                  </div>
                ))}
            </Card>
            <Card>
              <SecHead icon="✅" title="Good Practices"/>
              {analysis.atsCompatibility.goodPractices.length===0
                ?<div style={{fontSize:13,color:T.muted}}>None detected</div>
                :analysis.atsCompatibility.goodPractices.map((g,i)=>(
                  <div key={i} style={{fontSize:12.5,color:T.text,padding:"6px 0",borderBottom:`1px solid ${T.faint}`}}>✓ {g}</div>
                ))}
            </Card>
          </div>
        )}

        {activeTab==="jd"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Card style={{display:"flex",flexDirection:"column",alignItems:"center",padding:28,gap:6,justifyContent:"center"}}>
              <ScoreRing score={analysis.jobDescriptionMatch.matchScore} size={96}/>
              <div style={{fontWeight:700,fontSize:13.5,color:sc(analysis.jobDescriptionMatch.matchScore),marginTop:5}}>JD Keyword Match</div>
            </Card>
            <Card>
              <SecHead icon="✅" title="Keywords Found" right={<Badge label={analysis.jobDescriptionMatch.matchedKeywords.length} color={T.green} bg={T.greenLight}/>}/>
              <div>{analysis.jobDescriptionMatch.matchedKeywords.map(k=><Chip key={k} color={T.green} bg={T.greenLight}>{k}</Chip>)}</div>
            </Card>
            <Card>
              <SecHead icon="❌" title="Missing Keywords" right={<Badge label={analysis.jobDescriptionMatch.missingKeywords.length} color={T.red} bg={T.redLight}/>}/>
              <div>{analysis.jobDescriptionMatch.missingKeywords.map(k=><Chip key={k} color={T.red} bg={T.redLight}>{k}</Chip>)}</div>
            </Card>
            <Card>
              <SecHead icon="💡" title="Relevant Skills"/>
              <div>{analysis.jobDescriptionMatch.relevantSkillsFound.map(s=><Chip key={s} color={T.blue} bg={T.blueLight}>{s}</Chip>)}</div>
            </Card>
          </div>
        )}

        {activeTab==="company"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Card style={{display:"flex",flexDirection:"column",alignItems:"center",padding:28,gap:6,justifyContent:"center"}}>
              <ScoreRing score={analysis.companyFitAnalysis.fitScore} size={96}/>
              <div style={{fontWeight:700,fontSize:13.5,color:sc(analysis.companyFitAnalysis.fitScore),marginTop:5}}>{COMPANY_TYPES.find(c=>c.id===companyType)?.label} Fit</div>
            </Card>
            <Card>
              <SecHead icon="💡" title="Recommendation"/>
              <div style={{padding:"13px",background:T.blueLight,borderRadius:10,fontSize:13.5,color:T.text,lineHeight:1.65}}>{analysis.companyFitAnalysis.recommendation}</div>
            </Card>
            <Card>
              <SecHead icon="💪" title="Strengths"/>
              {analysis.companyFitAnalysis.strengths.map((s,i)=>(
                <div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:`1px solid ${T.faint}`}}>
                  <span style={{color:T.green,flexShrink:0}}>✓</span><span style={{fontSize:13,color:T.text}}>{s}</span>
                </div>
              ))}
            </Card>
            <Card>
              <SecHead icon="📌" title="Gaps to Fill"/>
              {analysis.companyFitAnalysis.gaps.map((g,i)=>(
                <div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:`1px solid ${T.faint}`}}>
                  <span style={{color:T.amber,flexShrink:0}}>→</span><span style={{fontSize:13,color:T.text}}>{g}</span>
                </div>
              ))}
            </Card>
          </div>
        )}

        {activeTab==="rewrites"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Card style={{background:T.blueLight,border:`1px solid ${T.blue}22`}}>
              <p style={{margin:0,fontSize:13,color:T.blue}}>💡 Replace weak bullets with the improved versions below.</p>
            </Card>
            {analysis.bulletImprovements.map((imp,i)=>(
              <Card key={i}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:13}}>
                  <div style={{width:22,height:22,borderRadius:99,background:T.blue,color:"#fff",fontSize:11,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{i+1}</div>
                  <span style={{fontSize:13,fontWeight:700,color:T.text}}>Bullet Improvement</span>
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:10,color:T.red,textTransform:"uppercase",marginBottom:5,fontWeight:600}}>❌ Before</div>
                  <div style={{padding:"9px 13px",background:T.redLight,borderRadius:8,borderLeft:`3px solid ${T.red}`,fontSize:13,color:"#7F1D1D",fontStyle:"italic"}}>{imp.before}</div>
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:10,color:T.green,textTransform:"uppercase",marginBottom:5,fontWeight:600}}>✅ After</div>
                  <div style={{padding:"9px 13px",background:T.greenLight,borderRadius:8,borderLeft:`3px solid ${T.green}`,fontSize:13,color:"#14532D"}}>{imp.after}</div>
                </div>
                <div style={{padding:"8px 12px",background:T.faint,borderRadius:8,fontSize:12,color:T.muted}}><strong>Why:</strong> {imp.reason}</div>
              </Card>
            ))}
            {analysis.bulletImprovements.length===0&&(
              <Card style={{textAlign:"center",padding:32}}>
                <div style={{fontSize:32,marginBottom:10}}>✅</div>
                <div style={{fontWeight:700,color:T.green}}>Bullets look strong!</div>
              </Card>
            )}
          </div>
        )}

        {activeTab==="resume"&&(
          <div>
            {!optimizedResume&&!generatingResume&&(
              <div style={{textAlign:"center",padding:"48px 24px"}}>
                <div style={{fontSize:48,marginBottom:16}}>📄</div>
                <div style={{fontFamily:"'Fraunces',serif",fontWeight:900,fontSize:22,color:T.text,marginBottom:10}}>Generate Optimised Resume</div>
                <p style={{color:T.muted,fontSize:14,maxWidth:480,margin:"0 auto 28px",lineHeight:1.7}}>ATS-ready resume with all fixes applied and keywords added.</p>
                <button onClick={async()=>{
                  setGeneratingResume(true);
                  try{const r=await generateOptimizedResume(resumeText,jobDesc,expLevel,companyType,analysis);setOptimizedResume(r);}
                  catch(e){alert("Failed: "+e.message);}
                  finally{setGeneratingResume(false);}
                }} style={{padding:"14px 40px",borderRadius:11,border:"none",background:T.blue,color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>
                  ⚡ Generate Optimised Resume
                </button>
              </div>
            )}
            {generatingResume&&(
              <div style={{textAlign:"center",padding:"60px 0"}}>
                <div style={{width:48,height:48,borderRadius:99,background:T.blueLight,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:20,animation:"spin 1.2s linear infinite"}}>✍️</div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:900,color:T.text}}>Writing your optimised resume...</div>
              </div>
            )}
            {optimizedResume&&!generatingResume&&(
              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <div>
                    <div style={{fontFamily:"'Fraunces',serif",fontWeight:900,fontSize:18,color:T.text}}>Your Optimised Resume</div>
                    <div style={{fontSize:12,color:T.muted}}>ATS-friendly · {COMPANY_TYPES.find(c=>c.id===companyType)?.label}</div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>{navigator.clipboard.writeText(optimizedResume);setCopied(true);setTimeout(()=>setCopied(false),2500);}}
                      style={{padding:"8px 18px",borderRadius:9,border:`1.5px solid ${copied?T.green:T.blue}`,background:copied?T.greenLight:T.blueLight,color:copied?T.green:T.blue,fontWeight:700,fontSize:13,cursor:"pointer"}}>
                      {copied?"✅ Copied!":"📋 Copy"}
                    </button>
                    <button onClick={()=>setOptimizedResume(null)} style={{padding:"8px 14px",borderRadius:9,border:`1.5px solid ${T.border}`,background:"#fff",color:T.muted,fontWeight:600,fontSize:13,cursor:"pointer"}}>↺ Redo</button>
                  </div>
                </div>
                <Card style={{padding:0,overflow:"hidden"}}>
                  <div style={{background:T.faint,borderBottom:`1px solid ${T.border}`,padding:"10px 18px",display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:10,height:10,borderRadius:99,background:"#FC5F57"}}/><div style={{width:10,height:10,borderRadius:99,background:"#FBBD2E"}}/><div style={{width:10,height:10,borderRadius:99,background:"#27C840"}}/>
                    <span style={{fontSize:11,color:T.muted,marginLeft:6,fontFamily:"monospace"}}>optimised_resume.txt</span>
                  </div>
                  <textarea readOnly value={optimizedResume} style={{width:"100%",minHeight:580,border:"none",padding:"22px 26px",fontSize:13,lineHeight:1.8,fontFamily:"monospace",color:T.text,background:"#FAFBFD",resize:"vertical",boxSizing:"border-box",outline:"none"}}/>
                </Card>
                <div style={{marginTop:12,padding:"12px 16px",background:T.amberLight,borderRadius:10,fontSize:12.5,color:T.text}}>
                  💡 Copy → paste into Word/Google Docs → Calibri 11pt → save as PDF → submit.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  return null;
}

/* ═══════════════════════════════════════
   ROOT APP
═══════════════════════════════════════ */
export default function App(){
  const [tool,setTool]=useState("resume");
  useEffect(()=>{
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,700&display=swap";
    document.head.appendChild(link);
  },[]);
  return(
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'DM Sans',sans-serif",color:T.text}}>
      <style>{`*{box-sizing:border-box;}@keyframes spin{to{transform:rotate(360deg);}}@keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}.fade-up{animation:fadeUp 0.35s ease both;}textarea{resize:vertical;}::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:#C8CDD8;border-radius:99px;}`}</style>
      <div style={{background:"#fff",borderBottom:`1px solid ${T.border}`,padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,height:56}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:9,background:`linear-gradient(135deg,${T.blue},${T.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>👁️</div>
          <div>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:900,fontSize:18,letterSpacing:-0.8,color:T.text,lineHeight:1}}>CVision</div>
            <div style={{fontSize:8.5,color:T.muted,letterSpacing:1.4,textTransform:"uppercase"}}>Career Intelligence</div>
          </div>
        </div>
        <div style={{display:"flex",gap:3,background:T.faint,borderRadius:10,padding:3}}>
          {[["resume","📄","Resume Analyser",T.blue],["github","🐙","GitHub Analyser",T.github]].map(([id,ic,label,col])=>(
            <button key={id} onClick={()=>setTool(id)}
              style={{padding:"7px 18px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,background:tool===id?"#fff":"transparent",color:tool===id?col:T.muted,boxShadow:tool===id?"0 1px 4px rgba(0,0,0,0.09)":"none",display:"flex",alignItems:"center",gap:6}}>
              {ic} {label}
            </button>
          ))}
        </div>
        <div style={{width:120}}/>
      </div>
      <div style={{maxWidth:"100%",padding:"20px 32px 48px"}}>
        <div className="fade-up" key={tool}>
          {tool==="resume"?<ResumeAnalyzer/>:<GitHubAnalyzer/>}
        </div>
      </div>
    </div>
  );
}