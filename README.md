# Automated Resume Screening Tool

An explainable, decision-support portfolio project that parses synthetic resumes (PDF, DOCX, TXT), detects declared skills and stated years of experience, computes textual vocabulary alignment using TF-IDF and cosine similarity, ranks applicants, flags missing prerequisite skills, and exports structured CSV reports.

Featuring a Python **FastAPI** backend, a **Next.js** recruiter dashboard, and a command-line interface (**CLI**).

---

> ### ⚠️ Responsible Use & Ethical Disclaimer
> **This project is strictly an educational student decision-support demo.**  
> - **Not an Automated Hiring Tool:** The generated score is a lexical similarity and keyword alignment metric against a specific job description. It **must never be interpreted as a hiring decision, a qualification guarantee, or a probability of job performance**.
> - **Human Review Required:** This software is designed solely as a workflow aid for human recruiters to surface missing prerequisites faster. Human recruiters must review applications independently.
> - **Synthetic Data Only:** All candidate profiles, contact details, company names, and work histories in this repository are 100% fictional.
> - **Upload Handling:** The application does not save resumes to its project folders or a database. Files are read for extraction and discarded after the request. FastAPI/Starlette may temporarily buffer larger multipart uploads while handling a request, so this demo should use synthetic data only.
> - **Scanned PDFs Unsupported:** Resumes submitted as scanned images or photos without an embedded selectable text layer are rejected with an explicit error message. Optical Character Recognition (OCR) is intentionally excluded by design to prevent erroneous OCR misinterpretations in a decision-support context.

---

## Table of Contents
1. [Project Overview & Problem Statement](#project-overview--problem-statement)
2. [Simple vs. Technical Explanation](#simple-vs-technical-explanation)
3. [Architecture & Workflow Diagram](#architecture--workflow-diagram)
4. [Scoring Formula & Shortlist Decision Rule](#scoring-formula--shortlist-decision-rule)
5. [Limitations of TF-IDF & Keyword Matching](#limitations-of-tf-idf--keyword-matching)
6. [Tech Stack & Package Versions](#tech-stack--package-versions)
7. [Repository Structure](#repository-structure)
8. [Windows PowerShell Setup & Installation](#windows-powershell-setup--installation)
9. [Running the Application](#running-the-application)
   - [Option A: Command-Line Runner (CLI)](#option-a-command-line-runner-cli)
   - [Option B: FastAPI Server](#option-b-fastapi-server)
   - [Option C: Next.js Recruiter Dashboard](#option-c-nextjs-recruiter-dashboard)
10. [REST API Documentation & Swagger](#rest-api-documentation--swagger)
11. [Synthetic Dataset & Expected Baseline Results](#synthetic-dataset--expected-baseline-results)
12. [Inspecting the Exported CSV Report](#inspecting-the-exported-csv-report)

---

## Project Overview & Problem Statement

Corporate job openings frequently attract hundreds of applications, overwhelming recruiting teams and leading to multi-week review backlogs. Traditional Application Tracking Systems (ATS) often operate as opaque "black boxes," rejecting candidates without explanation or relying on coarse keyword matching that candidates can manipulate.

The **Automated Resume Screening Tool** solves this problem by providing **explainable, transparent decision-support**:
- It extracts text cleanly across multiple standard formats (**PDF, DOCX, TXT**).
- It verifies stated must-have skills from an editable canonical vocabulary with alias mapping.
- It calculates stated candidate years of experience against the role's baseline requirements.
- It applies **TF-IDF unigram and bigram vectorization** paired with **cosine similarity** to measure semantic vocabulary breadth without relying on unexplainable neural models.
- It produces an itemized breakdown for every score alongside plain-language reasoning.

---

## Simple vs. Technical Explanation

### Simple Explanation (for Non-Technical Stakeholders)
Imagine a digital assistant helping a recruiter read a tall stack of resumes. You give the assistant the job posting and say, *"The candidate must know Python, FastAPI, and Docker, and have at least 4 years of experience."* The assistant scans each resume, highlights which required skills were found and which are missing, verifies how many years the applicant says they have worked, and computes a relevance score. The assistant doesn't make hiring decisions; instead, it hands the recruiter an organized list highlighting: *"Here is why Candidate A ranked higher than Candidate B, and here are the exact missing skills to ask about in the screening call."*

### Technical Explanation (for Software Engineers & Interviewers)
The system operates as an end-to-end NLP data pipeline:
1. **Extraction & Sanitization:** Binary input streams are parsed via `pypdf` (extracting text streams across document pages) and `python-docx` (iterating body paragraphs and table cells). Text is cleansed of NUL characters, unicode replacement sequences, and erratic whitespace before downstream consumption.
2. **Deterministic Entity Extraction:** Regular expressions utilizing word boundaries (`\b`) match canonical technical skills from an alias dictionary (e.g. matching `postgres`, `psql`, and `postgresql` to `PostgreSQL`). Regex patterns extract numerical experience mentions (e.g., `5 years of experience`).
3. **Statistical Vector Space Modeling:** A `TfidfVectorizer(ngram_range=(1, 2), stop_words='english')` creates sparse frequency-inverse document frequency vectors across the job description and candidate corpus. Unigrams capture standalone terms, while bigrams capture compound phrases (e.g., `fast api`, `rest apis`). Cosine similarity computes directional cosine angles in $N$-dimensional vector space ($0.0 \le \cos(\theta) \le 1.0$).
4. **Transparent Linear Composite Scoring:** A deterministic weighted sum combines cosine similarity ($0.40$), required skill coverage ($0.40$), and experience fit ($0.20$).
5. **Decoupled Client-Server Delivery:** Results are exposed through a high-throughput asynchronous **FastAPI** web service (with CORS and multipart handling) and consumed by a modern **Next.js 14 App Router** dashboard.

---

## Architecture & Workflow Diagram

```text
+----------------------------------------------------------------------------------------------------+
|                                     INCOMING INPUT SOURCES                                         |
|   - Synthetic Job Description (.txt / Form Input)                                                  |
|   - Multiple Resumes (.pdf [selectable], .docx [paragraphs + tables], .txt [UTF-8 / BOM])          |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                   PHASE 1: TEXT EXTRACTION SERVICE                                 |
|                       (backend/app/services/extractor.py - No App-Level Persistence)                |
|   • pypdf: Extracts text streams. Detects scanned image-only PDFs -> Rejects with clear message    |
|   • python-docx: Extracts document paragraphs and iterates table cells with row-level deduplication |
|   • utf-8-sig: Decodes TXT files safely stripping Byte Order Marks                                |
|   • clean_text(): Strips NUL (\x00) & control chars, normalizes Windows/Unix line endings         |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                   PHASE 2: MATCHING & SCORING SERVICE                              |
|                         (backend/app/services/matcher.py - Single Source)                           |
|   1. Skill Detection: Word-boundary regex with alias resolution (e.g. 'psql' -> 'PostgreSQL')     |
|   2. Experience Parsing: Regex captures stated candidate years vs. job requirement                |
|   3. TF-IDF & Cosine Similarity: TfidfVectorizer(ngram_range=(1,2)) computes lexical overlap      |
|   4. Composite Scoring: 40% Text Similarity + 40% Must-Have Skills + 20% Experience Fit           |
|   5. Shortlist Rule: Score >= Threshold (default 0.65) AND Missing Must-Haves == 0                 |
|   6. Plain-Language Explanation: Generates grammar-correct rationale ('1 year' vs '5 years')       |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                      DELIVERY & PRESENTATION TIERS                                 |
+--------------------------------+---------------------------------+---------------------------------+
|      Command-Line Runner       |       FastAPI REST Engine       |       Next.js Dashboard         |
|       (backend/cli.py)         |     (backend/app/main.py)       |      (frontend/app/page.tsx)    |
|  • Formatted ASCII Table       |  • GET  /health                 |  • Reactive Recruiter UI        |
|  • Threshold & Skills Overrides|  • POST /screen (JSON)          |  • Threshold Slider (0.30-0.95) |
|  • CSV File Export             |  • POST /screen/csv (Download)  |  • Progress Bars & Badges       |
|  • Terminal Rationale Log      |  • Request-Scoped File Handling |  • Interactive CSV Download     |
+--------------------------------+---------------------------------+---------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                      STRUCTURED CSV EXPORT                                         |
|                                (output/screening_report.csv)                                       |
|   Fields: Rank, Candidate Name, Filename, Total Score, Score Components (Sim, Skill, Exp),         |
|   Candidate Experience, Required Experience, Matched Must-Haves, Missing Must-Haves,               |
|   Decision, Full Explanation. Generated via python csv.DictWriter with QUOTE_MINIMAL.               |
+----------------------------------------------------------------------------------------------------+
```

---

## Scoring Formula & Shortlist Decision Rule

To avoid "black-box" scoring, the composite score is calculated using three transparent, documented factors:

$$\text{Overall Score} = (0.40 \times \text{Similarity}) + (0.40 \times \text{Skill Coverage}) + (0.20 \times \text{Experience Fit})$$

### 1. Text Similarity ($40\%$ Weight)
- Evaluates lexical and phrase alignment between the full resume text and the job description.
- Calculated via `scikit-learn`'s `TfidfVectorizer(ngram_range=(1, 2), stop_words='english')`.
- Produces a cosine similarity score bounded between $0.0$ and $1.0$.

### 2. Required Skill Coverage ($40\%$ Weight)
- Evaluates the candidate's coverage of mandatory must-have skills extracted from the job description (or explicitly overridden by the recruiter).
- Explicitly ignores sections labeled `Nice-to-Have` or `Preferred`.
- Calculated as:
  $$\text{Skill Coverage} = \frac{\text{Count of Matched Must-Haves}}{\text{Total Count of Must-Haves}}$$
- If no must-haves are defined in the job description, this defaults to neutral full coverage ($1.0$).

### 3. Experience Fit ($20\%$ Weight)
- Compares stated candidate years to the job's minimum requirement:
  $$\text{Experience Fit} = \min\left(1.0, \frac{\text{Candidate Stated Years}}{\text{Required Job Years}}\right)$$
- If the candidate's stated experience meets or exceeds the requirement, the component receives $1.0$ ($100\%$).
- If experience is unmentioned or cannot be extracted, a neutral score of $0.50$ ($50\%$) is assigned, and an explanatory note is logged in the candidate's review details.
- If the job description does not specify an experience requirement, this component is awarded $1.0$.

### Shortlist Decision Rule
A candidate is flagged as **`Shortlisted`** if and only if:
1. $\text{Overall Score} \ge \text{Shortlist Threshold}$ (Default is $0.65$ / $65\%$), **AND**
2. $\text{Missing Must-Haves} == 0$ (No required prerequisite skills are missing).

If a candidate achieves an overall score above the threshold but is missing even one mandatory skill, their status is set to **`Review Required`**, and the missing skill is explicitly highlighted.

> **Threshold Representation:** In the Next.js recruiter interface, the threshold is displayed to human users as a readable percentage (e.g. `65%`), but sent over the wire to the FastAPI server as a decimal float (`0.65`).

---

## Limitations of TF-IDF & Keyword Matching

As part of sound engineering and ethical AI hygiene, this project explicitly documents its algorithmic boundaries:

1. **Vocabulary Mismatch (Lexical vs. Semantic):** TF-IDF measures exact word and bigram occurrence. If a job description asks for *"Data Storage"* and a candidate writes *"Relational Persistence"*, TF-IDF will not associate the concepts unless explicit aliases or shared n-grams exist.
2. **Context Blindness:** Keyword matching detects the presence of a word, not the context. A resume stating *"Managed a team that moved away from Docker"* will register a match for the keyword `Docker`.
3. **Keyword Stuffing Vulnerability:** Frequency-based scoring can be manipulated if a candidate artificially pastes keywords in white or microscopic fonts.
4. **Stated vs. Verified Experience:** Regex parsing extracts what the applicant *states* on paper (e.g., *"5 years experience"*). It cannot verify the authenticity, depth, or quality of that experience.
5. **No OCR Support:** Scanned images or screenshot PDFs without embedded font glyphs are rejected by design. Optical Character Recognition (OCR) was excluded to prevent hallucinated or corrupted text parsing from influencing scores.

---

## Tech Stack & Package Versions

### Backend (Python 3.11.9)
- **FastAPI (`v0.165.0`)**: Modern, high-performance web framework for building APIs.
- **Uvicorn (`v0.54.0`)**: Lightning-fast ASGI web server implementation.
- **python-multipart (`v0.0.34`)**: Streaming multipart parser for file uploads.
- **pypdf (`v5.9.0`)**: Pure-Python PDF parsing and text stream extraction.
- **python-docx (`v1.2.0`)**: Microsoft Word document reader (paragraphs and table cells).
- **scikit-learn (`v1.9.1`)**: TF-IDF vectorization and cosine distance calculation.
- **pandas (`v2.3.3`)**: Structured data frame handling and CSV transformations.

### Frontend (Node.js v26.13.1, npm v11.20.0)
- **Next.js (`^14.2.24`, resolves to `14.2.35`)**: `package.json` declares the compatible version range; `package-lock.json` pins the installed build to `14.2.35`.
- **React (`v18.3.1`)**: Declarative UI component library.
- **TypeScript (`v5.4.5`)**: Static type safety and strict interface definitions.
- **Tailwind CSS (`v3.4.4`)**: Utility-first CSS framework for responsive layout.

---

## Repository Structure

```text
nxtwave/
├── backend/
│   ├── app/
│   │   ├── __init__.py               # Backend package definition
│   │   ├── main.py                   # FastAPI REST API (GET /health, POST /screen, POST /screen/csv)
│   │   └── services/
│   │       ├── __init__.py           # Re-exports extractor, matcher, and reporter
│   │       ├── extractor.py          # PDF, DOCX, and TXT parsing & whitespace normalization
│   │       ├── matcher.py            # Skill vocabulary, experience regex, TF-IDF scoring engine
│   │       └── reporter.py           # In-memory and file-based CSV export with quote escaping
│   ├── cli.py                        # Terminal screening runner with interactive arguments
│   ├── generate_samples.py           # Programmatic generator for fictional resumes & job description
│   ├── test_api.py                   # Automated test suite validating API endpoints and contract
│   └── requirements.txt              # Pinned Python package dependencies
├── data/
│   ├── sample_job_descriptions/
│   │   └── backend_developer.txt     # Senior Backend Python Developer target job description
│   └── sample_resumes/
│       ├── alex_morgan_resume.txt    # Fictional Candidate 1: High match (5 yrs, 7/7 must-haves)
│       ├── sarah_chen_resume.docx    # Fictional Candidate 2: Medium match (3 yrs, missing 2 skills)
│       └── jordan_lee_resume.pdf     # Fictional Candidate 3: Junior match (1 yr, missing 5 skills)
├── frontend/
│   ├── app/
│   │   ├── globals.css               # Tailwind CSS directives and theme variables
│   │   ├── layout.tsx                # Next.js root layout with metadata
│   │   └── page.tsx                  # Interactive recruiter dashboard page
│   ├── types/
│   │   └── screening.ts              # TypeScript interface contracts for screening results
│   ├── next.config.mjs               # Next.js configuration
│   ├── package.json                  # Frontend dependencies and run scripts
│   ├── postcss.config.js             # PostCSS Tailwind configuration
│   ├── tailwind.config.js            # Tailwind responsive design settings
│   └── tsconfig.json                 # TypeScript compiler configuration
├── output/
│   └── screening_report.csv          # Generated candidate screening report
├── .gitignore                        # Git exclusions (.venv, node_modules, .next, __pycache__)
└── README.md                         # Comprehensive project documentation
```

---

## Windows PowerShell Setup & Installation

### Step 1: Open Windows PowerShell
Navigate to the project root directory:
```powershell
cd C:\Users\Ravi\nxtwave
```

### Step 2: Configure Script Execution (If Required)
If PowerShell restricts running activation scripts, grant execution privileges for the current user:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

### Step 3: Create & Activate Virtual Environment
```powershell
# Create .venv
python -m venv .venv

# Activate .venv
.\.venv\Scripts\Activate.ps1
```

### Step 4: Install Python Dependencies
```powershell
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
```

### Step 5: Install Frontend Dependencies
```powershell
cd frontend
npm.cmd install
cd ..
```

---

## Running the Application

### Option A: Command-Line Runner (CLI)
Run batch screening directly in your terminal against the sample dataset:
```powershell
# 1. Run with default sample dataset
.\.venv\Scripts\python.exe backend/cli.py

# 2. Run with custom threshold, specific output path, and explicit required skills:
.\.venv\Scripts\python.exe backend/cli.py --job data/sample_job_descriptions/backend_developer.txt --resumes data/sample_resumes --threshold 0.65 --output output/screening_report.csv --skills "Python,FastAPI,Docker,PostgreSQL,Redis,REST APIs,Git"
```

### Option B: FastAPI Server
Start the backend web server with auto-reload:
```powershell
# In PowerShell Terminal 1:
.\.venv\Scripts\uvicorn.exe backend.app.main:app --reload --port 8000
```
- API Base URL: `http://127.0.0.1:8000`
- Interactive Swagger Documentation: `http://127.0.0.1:8000/docs`

### Option C: Next.js Recruiter Dashboard
Launch the recruiter dashboard in development mode:
```powershell
# In PowerShell Terminal 2:
cd frontend
npm.cmd run dev
```
Open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**

---

## REST API Documentation & Swagger

When the FastAPI server is running, navigate to **`http://127.0.0.1:8000/docs`** to test endpoints interactively.

### 1. `GET /health`
Returns system status, version, supported file formats, and the student disclaimer.
- **Response `200 OK`:**
  ```json
  {
    "status": "healthy",
    "app": "Automated Resume Screening Tool",
    "version": "1.0.0",
    "supported_formats": [".pdf", ".docx", ".txt"],
    "disclaimer": "Student decision-support demo; never an automated hiring decision or performance prediction."
  }
  ```

### 2. `POST /screen`
Accepts `multipart/form-data`:
- `job_description` (string, required): Full text of the target job description.
- `skills` (string, optional): Comma-separated list of must-have skills override.
- `threshold` (float, default: `0.65`): Shortlist score cutoff ($0.0 \le \text{threshold} \le 1.0$).
- `resumes` (files, required): One or more `.pdf`, `.docx`, or `.txt` files.
- **Response `200 OK`:** Returns structured screening summary, candidate ranks, score breakdowns, matched/missing skills, singular/plural experience, decisions, and plain-language explanations.

### 3. `POST /screen/csv`
Accepts the same multipart inputs as `/screen`, returning a downloadable CSV file attachment named `screening_report.csv` with standard `Content-Disposition` headers.

---

## Synthetic Dataset & Expected Baseline Results

Testing against `data/sample_job_descriptions/backend_developer.txt` (Senior Backend Python Developer, requiring **4 years** experience and **7 must-have skills**: `Python`, `FastAPI`, `Docker`, `PostgreSQL`, `Redis`, `REST APIs`, `Git`):

| Rank | Candidate & File | Format | Score | Breakdown (Sim / Skill / Exp) | Experience | Missing Must-Haves | Decision |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- | :---: |
| **1** | **Alex Morgan**<br>`alex_morgan_resume.txt` | TXT | **68.9%** | 22.3% / 100.0% / 100.0% | 5 years | *None* | **Shortlisted** |
| **2** | **Sarah Chen**<br>`sarah_chen_resume.docx` | DOCX | **46.8%** | 8.0% / 71.4% / 75.0% | 3 years | `FastAPI`, `Redis` | **Review Required** |
| **3** | **Jordan Lee**<br>`jordan_lee_resume.pdf` | PDF | **18.8%** | 6.0% / 28.6% / 25.0% | 1 year | 5 missing skills | **Review Required** |

---

## Inspecting the Exported CSV Report

The CSV report generated by the CLI or downloaded from the dashboard is saved at `output/screening_report.csv`.

To view its raw contents in PowerShell:
```powershell
Get-Content output/screening_report.csv
```

To display it formatted in the console:
```powershell
Import-Csv output/screening_report.csv | Format-Table -AutoSize
```

