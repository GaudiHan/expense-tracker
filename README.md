# Ledger — Expense Tracker

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
| [Firebase CLI](https://firebase.google.com/docs/cli) | Deploy the frontend — `npm install -g firebase-tools` | `firebase --version` |

You'll also want a free [Neon](https://neon.tech) account (Postgres) and a free
[Google Cloud](https://console.cloud.google.com) account. Both are free btw..

---

## 2. Run it locally first

**Backend** (uses an in-memory H2 database by default — no setup needed):

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
3. Keep these somewhere safe — you'll add them as GitHub secrets in step 4.

### 3b. Google Cloud project
1. Create a project at [console.cloud.google.com](https://console.cloud.google.com).
2. Enable these APIs (Console → APIs & Services → Enable):
   `Cloud Run API`, `Artifact Registry API`.
3. Create an Artifact Registry Docker repo:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   gcloud artifacts repositories create expense-tracker \
     --repository-format=docker \
     --location=us-central1
   ```
4. Create a service account for GitHub Actions to deploy with, and a JSON key:
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
   Open `gh-deployer-key.json`, copy its full contents — you'll paste it into
   a GitHub secret in step 4. **Delete the local file afterward**; don't commit it.

### 3c. Firebase Hosting (free forever at this scale)
1. In the [Firebase console](https://console.firebase.google.com), add your
   existing GCP project (Firebase can attach to a GCP project you already made).
2. From `frontend/`, run `firebase login` then `firebase init hosting`,
   selecting your project and `dist` as the public directory, and
   configuring as a single-page app (yes). This overwrites `firebase.json`
   and `.firebaserc` with your real project id — that's expected.
3. Generate a service account for CI deploys:
   ```bash
   firebase init hosting:github
   ```
   This walks you through creating `FIREBASE_SERVICE_ACCOUNT` as a GitHub
   secret automatically. If you'd rather do it by hand, generate a key from
   Firebase console → Project settings → Service accounts.

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
| `JWT_SECRET` | Any long random string, e.g. output of `openssl rand -base64 32` |
| `CORS_ALLOWED_ORIGINS` | Your Firebase Hosting URL, e.g. `https://your-project.web.app` |
| `VITE_API_URL` | Your Cloud Run URL, e.g. `https://expense-tracker-api-xxxx.run.app` |
| `FIREBASE_SERVICE_ACCOUNT` | From `firebase init hosting:github`, or a service account key JSON |
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
- `.github/workflows/backend-deploy.yml` — runs tests, builds the Docker
  image, pushes it to Artifact Registry, deploys to Cloud Run.
- `.github/workflows/frontend-deploy.yml` — builds the Vite app, deploys to
  Firebase Hosting.

Each only runs when files under its respective folder change, so a
frontend-only commit won't redeploy the backend and vice versa.

---

## 6. What this demonstrates (and why it's built this way)

- **Layered backend architecture** — controller → service → repository,
  mirroring the pattern from the Task Manager API project, this time in Java/Spring.
- **Stateless JWT auth** with BCrypt password hashing and a security filter
  chain, rather than session cookies — appropriate for a decoupled SPA + API.
- **Resource-ownership checks return 404, not 403**, on cross-user access —
  same defensive pattern as the C++ project, to avoid leaking resource existence.
- **Cost-safe cloud architecture**: Cloud Run scales to zero (no idle
  compute cost) and Neon's free Postgres tier has no time limit, so the whole
  stack can sit deployed indefinitely at $0.
- **CI/CD with path filtering**: two independent pipelines so backend and
  frontend deploy independently, each gated by tests passing first.

## Troubleshooting

- **Cloud Run deploy fails with a permissions error** — double check the three
  `add-iam-policy-binding` roles above were applied to the *exact* service
  account email used in `GCP_SA_KEY`.
- **Frontend loads but API calls fail (CORS)** — `CORS_ALLOWED_ORIGINS` on the
  backend must exactly match the frontend's origin, including `https://` and
  no trailing slash.
- **Local backend won't start** — check nothing else is bound to port 8080,
  or set `PORT` in your environment.
