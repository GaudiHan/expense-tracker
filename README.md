# Ledger - Expense Tracker

A small full-stack app: React + TypeScript frontend, Spring Boot (Java) backend,
Postgres database, deployed on Google Cloud Run + Firebase Hosting with a
GitHub Actions CI/CD pipeline. Built to run entirely on free tiers.

```
expense-tracker/
├── backend/     Spring Boot REST API (Java 17)
├── frontend/    React + TypeScript SPA (Vite)
└── .github/workflows/   CI/CD pipelines
```

---

## 1. Install these first

| Tool | Why | Check |
|---|---|---|
| [JDK 17](https://adoptium.net/) (Temurin) | Run/build the backend | `java -version` |
| [Maven](https://maven.apache.org/download.cgi) | Build the backend (or use the included `mvnw` if you add one) | `mvn -version` |
| [Node.js 20+](https://nodejs.org/) | Run/build the frontend | `node -v` |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Build the backend container | `docker -v` |
| [Git](https://git-scm.com/) | Version control | `git --version` |
| [gcloud CLI](https://cloud.google.com/sdk/docs/install) | Deploy to Cloud Run | `gcloud version` |
| [Firebase CLI](https://firebase.google.com/docs/cli) | Deploy the frontend `npm install -g firebase-tools` | `firebase --version` |

You'll also want a free [Neon](https://neon.tech) account (Postgres) and a free
[Google Cloud](https://console.cloud.google.com) account. Neither requires a
credit card for the tiers this project uses, **except** that Google Cloud
still requires a billing account to be *linked* to your project before it
will activate Cloud Run and Artifact Registry, even if you never leave the
free tier. See 3b for details.

---

## 2. Run it locally first

> **Windows notes:** commands throughout this README use macOS/Linux
> syntax. On Windows:
> - `cp` → `copy` (PowerShell/cmd)
> - Multi-line commands use `\` for line continuation; in PowerShell use
>   `` ` `` (backtick) instead
> - The `curl -d '...'` examples with unescaped double quotes can fail in
>   PowerShell. Either escape the inner quotes (`\"`), or use
>   `Invoke-RestMethod` instead:
>   ```powershell
>   Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/auth/register `
>     -ContentType "application/json" `
>     -Body '{"email":"you@example.com","password":"password123"}'
>   ```
> - `openssl` (used later for `JWT_SECRET`) often isn't installed by
>   default; a PowerShell-only alternative is given in Step 4.

**Backend** (uses an in-memory H2 database by default, no setup needed):

```bash
cd backend
mvn spring-boot:run
```

It starts on `http://localhost:8080`. Try it:

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"password123"}'
```

**Frontend**, in a second terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`, register, and start adding expenses.

---

## 3. Set up the cloud pieces (one-time)

### 3a. Neon (Postgres, free forever)
1. Create a project at [neon.tech](https://neon.tech).
2. Copy the connection string it gives you. Split it into the three pieces
   the backend expects: `DB_URL` (as a JDBC url, e.g.
   `jdbc:postgresql://<host>/<db>?sslmode=require`), `DB_USERNAME`, `DB_PASSWORD`.
3. Keep these somewhere safe, you'll add them as GitHub secrets in step 4.

### 3b. Google Cloud project
1. Create a project at [console.cloud.google.com](https://console.cloud.google.com).
   Note the **Project ID** it generates, it may not exactly match the name
   you typed (GCP appends a suffix if your preferred ID is taken globally).
   Use the exact Project ID for every command and secret below.
2. **Link a billing account.** Go to
   [console.cloud.google.com/billing](https://console.cloud.google.com/billing),
   create/attach a billing account, and make sure it's linked to *this*
   project (Billing → Account Management → Linked projects). This is
   required before Cloud Run or Artifact Registry will activate, even
   though this project stays within free-tier limits (GCP uses it as
   identity verification, not a guarantee you'll be charged). Skipping this
   step produces:
   ```
   FAILED_PRECONDITION: Billing account for project '...' is not found.
   ```
3. Enable these APIs (Console → APIs & Services → Enable), **on the project
   you just linked billing to**:
   `Cloud Run API`, `Artifact Registry API`.
4. Create an Artifact Registry Docker repo:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   gcloud artifacts repositories create expense-tracker \
     --repository-format=docker \
     --location=us-central1
   ```
5. Create a service account for GitHub Actions to deploy with, and a JSON key:
   ```bash
   gcloud iam service-accounts create gh-deployer \
     --display-name="GitHub Actions deployer"

   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:gh-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/run.admin"

   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:gh-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/artifactregistry.writer"

   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:gh-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/iam.serviceAccountUser"

   gcloud iam service-accounts keys create gh-deployer-key.json \
     --iam-account=gh-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```
   Open `gh-deployer-key.json`, copy its full contents, you'll paste it into
   a GitHub secret in step 4. **Delete the local file afterward**; don't commit it.

### 3c. Firebase Hosting (free forever at this scale)
1. In the [Firebase console](https://console.firebase.google.com), add your
   existing GCP project (Firebase can attach to a GCP project you already made).
2. From `frontend/`, run `firebase login` then `firebase init hosting`,
   selecting your project and `dist` as the public directory, and
   configuring as a single-page app (yes). This overwrites `firebase.json`
   and `.firebaserc` with your real project id, that's expected.

   **⚠️ Check `.firebaserc` after this step.** Firebase project IDs are
   globally unique across *every* Firebase user, not just your account. If
   your GCP project ID is already taken as a Firebase ID by someone else,
   Firebase silently assigns a *different* ID (typically your ID plus a
   random suffix, e.g. `my-project-2026` → `my-project-20-7ac59`) instead
   of erroring. Open `.firebaserc` and confirm the `"default"` value, if it
   doesn't match your GCP project ID, Firebase is now a functionally
   separate project from your Cloud Run backend (different project number).
   This still works fine, Hosting and Cloud Run only need to talk over
   HTTPS/CORS, but use the **actual value from `.firebaserc`**, not your
   original GCP project ID, for `FIREBASE_PROJECT_ID` and your Hosting URL
   everywhere below.
3. Generate a service account for CI deploys:
   ```bash
   firebase init hosting:github
   ```
   This walks you through creating a `FIREBASE_SERVICE_ACCOUNT_...` GitHub
   secret automatically. **Note:** recent versions of the Firebase CLI name
   this secret `FIREBASE_SERVICE_ACCOUNT_<PROJECT_ID>` rather than a plain
   `FIREBASE_SERVICE_ACCOUNT`, check Settings → Secrets on GitHub for the
   exact name it created, and update the `firebaseServiceAccount:` line in
   `frontend-deploy.yml` to match. If you'd rather do it by hand, generate a
   key from Firebase console → Project settings → Service accounts.

---

## 4. Add GitHub repo secrets

Repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|---|---|
| `GCP_PROJECT_ID` | Your GCP project id |
| `GCP_SA_KEY` | Full contents of `gh-deployer-key.json` |
| `DB_URL` | Neon JDBC url |
| `DB_USERNAME` | Neon username |
| `DB_PASSWORD` | Neon password |
| `JWT_SECRET` | Any long random string, e.g. output of `openssl rand -base64 32` (Windows without `openssl`: `[Convert]::ToBase64String((1..32 \| ForEach-Object { Get-Random -Maximum 256 }))` in PowerShell) |
| `CORS_ALLOWED_ORIGINS` | Your Firebase Hosting URL, e.g. `https://your-project.web.app` |
| `VITE_API_URL` | Your Cloud Run URL, e.g. `https://expense-tracker-api-xxxx.run.app` |
| `FIREBASE_SERVICE_ACCOUNT_<PROJECT_ID>` | Auto-created by `firebase init hosting:github`, check GitHub → Settings → Secrets for the exact generated name, and match it in `frontend-deploy.yml`'s `firebaseServiceAccount:` line |
| `FIREBASE_PROJECT_ID` | Your Firebase/GCP project id |

Note the slight chicken-and-egg step: deploy the backend once first (so you
have a Cloud Run URL for `VITE_API_URL`), then deploy the frontend.

---

## 5. Ship it

```bash
git init
git add .
git commit -m "Initial commit: expense tracker full-stack app"
git remote add origin <your-empty-github-repo-url>
git push -u origin main
```

Pushing to `main` triggers both workflows:
- `.github/workflows/backend-deploy.yml`; runs tests, builds the Docker
  image, pushes it to Artifact Registry, deploys to Cloud Run.
- `.github/workflows/frontend-deploy.yml`; builds the Vite app, deploys to
  Firebase Hosting.

Each only runs when files under its respective folder change, so a
frontend-only commit won't redeploy the backend and vice versa.

---

## 6. What this demonstrates (and why it's built this way)

**Application design**
- **Layered backend architecture**; controller → service → repository,
  mirroring the pattern from the Task Manager API project, this time in Java/Spring.
- **Stateless JWT auth** with BCrypt password hashing and a security filter
  chain, rather than session cookies; appropriate for a decoupled SPA + API.
- **Resource-ownership checks return 404, not 403**, on cross-user access;
  same defensive pattern as the C++ project, to avoid leaking resource existence.

**Cloud infrastructure & delivery**
- **Infrastructure provisioned via CLI, not console clicking**; Artifact
  Registry repo and IAM service account created and bound entirely through
  scripted `gcloud` commands, so the setup is reproducible and auditable
  rather than a one-off set of manual clicks.
- **Least-privilege IAM**; the GitHub Actions deployer service account is
  granted exactly three scoped roles (`run.admin`, `artifactregistry.writer`,
  `iam.serviceAccountUser`) rather than a broad project-owner role.
- **Zero credentials in source control**; GCP and Firebase service account
  keys exist only as encrypted GitHub Actions secrets, injected at deploy
  time; nothing sensitive is ever committed.
- **Path-filtered, independently-deployable CI/CD**; two decoupled
  pipelines (`backend-deploy.yml`, `frontend-deploy.yml`), each gated by
  tests passing first, so a frontend-only change can't trigger an
  unnecessary backend redeploy and vice versa.
- **Cost-safe, scale-to-zero architecture**; Cloud Run scales to zero (no
  idle compute cost) and Neon's free Postgres tier has no time limit, so the
  whole stack (a live, publicly reachable full-stack app) runs
  indefinitely at $0 steady-state cost.
- **Diagnosed and resolved real multi-cloud identity issues during setup**,
  including a billing-activation precondition failure and a global
  Firebase/GCP project-ID namespace collision that caused Hosting and
  Cloud Run to land in two distinct underlying projects, adapting the
  deploy configuration accordingly rather than starting over.

## Troubleshooting

- **`FAILED_PRECONDITION: Billing account for project '...' is not found`**
 ; a billing account isn't linked to the project `gcloud` is currently
  pointed at. Run `gcloud config get-value project` to check which project
  is active, `gcloud projects list` to see all your projects, and link
  billing to the correct one at
  console.cloud.google.com/billing/linkedaccount before retrying.
- **Firebase project ID in `.firebaserc` doesn't match your GCP project ID**
 ; not a bug. Firebase IDs are globally unique across all users, so yours
  may have been reassigned with a suffix. Use the ID actually in
  `.firebaserc` for `FIREBASE_PROJECT_ID` and your Hosting URL; Hosting and
  Cloud Run don't need to share a project.
- **Frontend deploy fails with a missing/empty `FIREBASE_SERVICE_ACCOUNT`
  secret**; `firebase init hosting:github` may have named the secret
  `FIREBASE_SERVICE_ACCOUNT_<PROJECT_ID>` instead. Check the exact name in
  GitHub → Settings → Secrets and update the `firebaseServiceAccount:` line
  in `frontend-deploy.yml` to match, rather than creating a duplicate secret.
- **Cloud Run deploy fails with a permissions error**; double check the three
  `add-iam-policy-binding` roles above were applied to the *exact* service
  account email used in `GCP_SA_KEY`.
- **Frontend loads but API calls fail (CORS)**; `CORS_ALLOWED_ORIGINS` on the
  backend must exactly match the frontend's origin, including `https://` and
  no trailing slash.
- **Local backend won't start**; check nothing else is bound to port 8080,
  or set `PORT` in your environment.