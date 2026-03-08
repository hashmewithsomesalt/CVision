CVision is a powerful, AI-driven career intelligence platform that provides deep analysis of resumes and GitHub profiles. Built with React and powered by Claude AI, it helps job seekers optimize their applications for Applicant Tracking Systems (ATS) and stand out to recruiters.

✨ Features
📄 Resume Analyzer
PDF Upload & Text Paste – Upload your resume (PDF) or paste text directly

ATS Compatibility Scoring – Get a detailed breakdown of how well your resume performs with ATS bots

Job Description Matching – Compare your resume against any job description

Section-by-Section Analysis – Score and feedback for:

Contact Information

Professional Summary

Work Experience

Education

Skills

Projects

Certifications

Company Fit Analysis – Tailored feedback based on company type (Product, Service, Startup, MNC)

Bullet Point Rewrites – AI-powered improvements for weak bullet points with "before/after" examples

Optimized Resume Generation – Generate a fully ATS-friendly version with missing keywords added

Keyword Gap Analysis – See which keywords from the job description are missing

🐙 GitHub Profile Analyzer
Username/URL Input – Analyze any public GitHub profile

Comprehensive Profile Scoring – Overall, Activity, Portfolio, Code Quality scores

Language Distribution – Visual breakdown of programming languages used

Repository Analysis – Deep dive into top repositories with complexity and impressiveness ratings

Commit Pattern Assessment – Understand activity consistency

Missing Skills Detection – Identify what's needed for your target role

Hirability Verdict – AI-generated assessment for recruiters

Personalized Recommendations – Actionable steps to improve your profile

🎨 Beautiful, Responsive UI
Modern, clean interface with smooth animations

Score rings with animated progress

Color-coded feedback (Green = Good, Amber = Average, Red = Needs Work)

Tabbed interface for organized results

Mobile-friendly design

🚀 Live Demo
👉 Try CVision Live (coming soon)

📸 Screenshots
Screenshots coming soon

🛠️ Technology Stack
Category	Technologies
Frontend	React 18, Hooks (useState, useEffect, useRef)
AI/ML	Anthropic Claude 3.5 Sonnet API
APIs	GitHub REST API v3
PDF Processing	PDF.js (Mozilla)
Styling	CSS-in-JS, Custom animations
Icons	Emoji-based (no external icon library)
📋 Prerequisites
Node.js 16+ and npm/yarn

Anthropic API key (for Claude AI)

Internet connection (for GitHub API and PDF.js CDN)

🔧 Installation & Setup
Clone the repository

bash
git clone https://github.com/yourusername/cvision.git
cd cvision
Install dependencies

bash
npm install
# or
yarn install
Set up environment variables

Create a .env file in the root directory:

env
REACT_APP_ANTHROPIC_API_KEY=your_anthropic_api_key_here
Note: The app currently uses a hardcoded API endpoint. For production, you should proxy requests through your own backend to protect your API key.

Start the development server

bash
npm start
# or
yarn start
Open the app

Visit http://localhost:3000

🏗️ Project Structure
text
cvision/
├── src/
│   ├── App.js                 # Main application component
│   ├── index.js               # Entry point
│   └── ...
├── public/
│   ├── index.html
│   └── ...
├── .env.example               # Example environment variables
├── package.json
├── README.md
└── LICENSE
🎯 How It Works
Resume Analysis Flow
Input – Upload PDF or paste resume text + job description

Processing – PDF.js extracts text from uploaded files

AI Analysis – Claude AI analyzes the resume using XML-based prompts

Scoring – Multiple scores calculated (ATS, JD Match, Company Fit)

Feedback – Detailed issues, strengths, and quick wins presented

Optimization – Generate improved resume with missing keywords

GitHub Analysis Flow
Input – Enter GitHub username or profile URL

Data Fetching – GitHub API retrieves user, repo, and language data

AI Analysis – Claude evaluates the profile against target role

Scoring – Overall, Activity, Portfolio, Code Quality scores

Insights – Strengths, weaknesses, missing skills, recommendations

AI Prompt Engineering
The app uses XML-tagged prompts (not JSON) to ensure consistent, parseable responses from Claude:

xml
<detectedRole>Full Stack Developer</detectedRole>
<atsScore>72</atsScore>
<matchedKeywords>React, Node.js, MongoDB</matchedKeywords>
<missingKeywords>Docker, AWS, Kubernetes</missingKeywords>
This approach guarantees reliable parsing without JSON formatting errors.

📊 Scoring System
Score Range	Rating	Color
75–100	Excellent	🟢 Green
50–74	Good/Average	🟡 Amber
25–49	Needs Work	🔴 Red
0–24	Poor	🔴 Dark Red
Section Scores are on a 0–10 scale with the same color coding.

🔑 Key Components
ResumeAnalyzer()
Handles resume upload, analysis, and optimization. Features:

File drag & drop

Tabbed results (Overview, Sections, ATS, JD Match, Company, Rewrites, Optimised)

Bullet point rewriting

Optimized resume generation

GitHubAnalyzer()
Manages GitHub profile analysis. Features:

Username/URL parsing

Rate limit handling with user-friendly messages

Language distribution charts

Repository-level analysis

Commit pattern assessment

callClaude()
Async function that communicates with Anthropic's API. Includes:

Error handling

Token management

Response parsing

extractTextFromPDF()
Uses PDF.js to extract text from uploaded resumes. Falls back gracefully if loading fails.

fetchGitHubData()
Fetches user data, repositories, and language statistics from GitHub API. Handles:

Rate limiting (403 errors)

404 not found

Timeouts

Partial failures (continues even if some data missing)

⚠️ Known Limitations & Considerations
GitHub Rate Limiting: Unauthenticated requests are limited to 60/hour. The app includes user-friendly error messages.

API Key Security: Currently, the Anthropic API key is hardcoded. For production, implement a backend proxy.

PDF Parsing: Some PDFs may not extract text correctly (scanned images, complex formatting). The app suggests pasting text as a fallback.

File Size: Very large PDFs may timeout during processing.

Browser Support: Requires modern browser with ES6+ support.

🔮 Future Enhancements
Backend proxy for secure API key management

User accounts to save analysis history

LinkedIn profile integration

Multiple resume versions comparison

Export reports as PDF

More detailed company database

Interview question generator based on gaps

Dark mode 🌙

🤝 Contributing
Contributions are welcome! Please follow these steps:

Fork the repository

Create a feature branch (git checkout -b feature/amazing-feature)

Commit your changes (git commit -m 'Add amazing feature')

Push to the branch (git push origin feature/amazing-feature)

Open a Pull Request

Please ensure your code follows the existing style and includes appropriate comments.

📝 License
This project is licensed under the MIT License - see the LICENSE file for details.

🙏 Acknowledgements
Anthropic for Claude AI

Mozilla for PDF.js

GitHub for the excellent API

Google Fonts for DM Sans and Fraunces

📬 Contact
Aryan Dev – aryanatwork45@gmail.com

Project Link: https://github.com/hashmewithsoemsalt/cvision
