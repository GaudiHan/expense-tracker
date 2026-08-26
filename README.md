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
| [Firebase CLI](https://firebase.google.com/docs/cli) | Deploy the frontend (`npm install -g firebase-tools`) | `firebase --version` |

You will also want a free [Neon](https://neon.tech) account (Postgres) and a free
[Google Cloud](https://console.cloud.google.com) account. Neither of them requires a
credit card for this project's uses.

**Exception:** Google Cloud still needs a billing account to be 
linked to your project to activate Cloud Run and Artifact Registry, 
even if you never leave the free tier. See 3b for details.

---

## 2. Run locally first

**Backend**:

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

**Frontend** (in a second terminal):

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`, register, then you can start adding expenses.

---

## 3. Set up the cloud (one-time)

### 3a. Neon (Postgres, free forever)
1. Create a project at [neon.tech](https://neon.tech).
2. Copy the connection string it gives you. Split it into the three pieces;
   the backend expects: `DB_URL` (e.g.
   `jdbc:postgresql://<host>/<db>?sslmode=require`), 
   `DB_USERNAME`, `DB_PASSWORD`.
3. Absolutely keep them somewhere safe, you will add them as 
   GitHub secrets in the end (step 4).

### 3b. Google Cloud project
1. Create a project at 
   [console.cloud.google.com](https://console.cloud.google.com).
   Note the **Project ID** it generates, it may not exactly match the name
   you typed. **Use the exact Project ID for every command and secret below**.
2. Link a billing account. Go to
   [console.cloud.google.com/billing](https://console.cloud.google.com/billing),
   create/attach a billing account, and make sure it's linked to this
   project (Billing > Account Management > Linked projects). This is
   required before Cloud Run or Artifact Registry will activate, 
   but the project should stay within free-tier limits. Skipping this
   step for me produces:
   ```
   FAILED_PRECONDITION: Billing account for project '...' is not found.
   ```
3. Enable these APIs (go to Console > APIs & Services > Enable) on the project
   linked billing to. Find `Cloud Run API` and `Artifact Registry API`.
4. Create an Artifact Registry Docker repo:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   gcloud artifacts repositories create expense-tracker \
     --repository-format=docker \
     --location=us-central1
   ```
5. Create a service account for GitHub Actions to deploy with and a JSON key:
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
   Open `gh-deployer-key.json`, copy its full contents, you will need this at
   the end (step 4). **DELETE THE LOCAL FILE AFTERWARD; DO NOT COMMIT THIS**.

### 3c. Firebase Hosting (should be free forever at this scale)
1. In the [Firebase console](https://console.firebase.google.com), add your
   existing GCP project (Firebase can attach to a GCP project you already made).
2. From `frontend/`, run `firebase login` then `firebase init hosting`,
   select your project, `dist` as the public directory. 
   This overwrites `firebase.json` and `.firebaserc` with your real project id.

   **!!!Check `.firebaserc` after this step!!!** Firebase might assign a
   different ID if your ID has already been taken by someone else, instead
   of erroring. Open `.firebaserc` and confirm the `"default"` value.
3. Generate service account for CI deploys:
   ```bash
   firebase init hosting:github
   ```

---

## 4. Add GitHub repo secrets

Repo > Settings > Secrets and variables > Actions > New repository secret:

| Secret | Value |
|---|---|
| `GCP_PROJECT_ID` | Your GCP project id |
| `GCP_SA_KEY` | Full contents of `gh-deployer-key.json` |
| `DB_URL` | Neon JDBC url |
| `DB_USERNAME` | Neon username |
| `DB_PASSWORD` | Neon password |
| `JWT_SECRET` | Long random string, e.g. output of `openssl rand -base64 32` |
| `CORS_ALLOWED_ORIGINS` | Your Firebase Hosting URL, e.g. `https://your-project.web.app` |
| `VITE_API_URL` | Your Cloud Run URL, e.g. `https://expense-tracker-api-xxxx.run.app` |
| `FIREBASE_SERVICE_ACCOUNT_<PROJECT_ID>` | Auto-created by `firebase init hosting:github`; check GitHub > Settings > Secrets for the exact generated name, and match it in `frontend-deploy.yml` > `firebaseServiceAccount:` line |
| `FIREBASE_PROJECT_ID` | Your Firebase project id |

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
- `.github/workflows/backend-deploy.yml`, run tests, builds the Docker
  image, pushes it to Artifact Registry, deploys to Cloud Run.
- `.github/workflows/frontend-deploy.yml`, build the Vite app, deploys to
  Firebase Hosting.

Each only runs when files under its respective folder change, so a
frontend-only commit won't redeploy the backend and vice versa.

---

## 6. What this demonstrates (and why it's built this way)

**Measured metrics**
- 7 REST endpoints
- 8 automated backend tests (MockMvc integration tests) all passing,
  covering the register-login flow, expense CRUD, input validation, and
  the cross-user 404-not-403 ownership check described below
- Cloud Run cold start: 15.55s from idle vs. 0.33s warm
- Lighthouse (production build): 97 Performance, 91 Accessibility,
  100 Best Practices, 82 SEO
- $0/month production cost

**Application design**
- **Layered backend architecture**: controller > service > repository.
  This mirror the pattern from the other project (Task Manager API), 
  but this time done in in Java/Spring.
- **Stateless JWT auth** with BCrypt password hashing and a security filter
  chain, instead of session cookies. Should be appropriate for a decoupled SPA + API.
- **Resource-ownership checks return 404, not 403** on cross-user access.
  Same defensive pattern as the Task Manager API project, 
  to avoid leaking resource existence.

**Cloud infrastructure & delivery**
- **Infrastructure provisioned via CLI, not console clicking**; artifact
  Registry repo and IAM service account created and bound entirely through
  scripted `gcloud` commands, so the setup is reproducible and auditable
  rather than a one-off set of manual clicks.
- **Least-privilege IAM**: the GitHub Actions deployer service account is
  granted exactly three scoped roles (`run.admin`, `artifactregistry.writer`,
  `iam.serviceAccountUser`) rather than a broad project-owner role.
- **Zero credentials in source control**; GCP and Firebase service account
  keys exist only as encrypted GitHub Actions secrets, injected at deploy
  time (so basically nothing sensitive is committed).
- **Path-filtered, independently-deployable CI/CD**; two decoupled
  pipelines (`backend-deploy.yml` and `frontend-deploy.yml`), each of them 
  gated by tests passing first. Hence a frontend-only change can't trigger an
  unnecessary backend redeploy (and vice versa).
- **Cost-safe, scale-to-zero architecture**; Cloud Run scales to zero (no
  idle compute cost) and Neon's free Postgres tier has no time limit, so the
  whole stack should run indefinitely for free, and stay live as a publicly 
  reachable full-stack app.
- **Diagnosed and resolved real multi-cloud identity issues during setup**,
  including a billing-activation precondition failure and a global
  Firebase/GCP project-ID namespace collision that caused Hosting and
  Cloud Run to land in two distinct underlying projects (i.e. adapt the
  deploy configuration accordingly rather than start over).

## Troubleshooting (and problems encountered personally)

- **`FAILED_PRECONDITION: Billing account for project '...' is not found`**; 
  a billing account isn't linked to the project `gcloud` is currently
  pointed at. Run `gcloud config get-value project` to check which project
  is active, `gcloud projects list` to see all your projects, and link
  billing to the correct one at
  console.cloud.google.com/billing/linkedaccount before retrying.
- **Firebase project ID in `.firebaserc` doesn't match your GCP project ID**
  is not a bug. Firebase IDs are globally unique across all users, so your 
  project ID mayv'e been reassigned with a suffix. Use the ID in
  `.firebaserc` for `FIREBASE_PROJECT_ID` and your Hosting URL (Hosting and
  Cloud Run don't need to share a project).
- **Frontend deploy fails with a missing/empty `FIREBASE_SERVICE_ACCOUNT`
  secret**; `firebase init hosting:github` may have named the secret
  `FIREBASE_SERVICE_ACCOUNT_<PROJECT_ID>` instead. Check the exact name in
  GitHub → Settings → Secrets and update the `firebaseServiceAccount:` line
  in `frontend-deploy.yml` to match, rather thanhaving duplicate secret.
- **Cloud Run deploy fails with a permissions error**; double check the three
  `add-iam-policy-binding` roles above were applied to the exact service
  account email used in `GCP_SA_KEY`.
- **Frontend loads but API calls fail (CORS)**; `CORS_ALLOWED_ORIGINS` on the
  backend gotta match the frontend's origin.
- **Local backend won't start**; check nothing else is bound to port 8080,
  or set `PORT` in your environment.