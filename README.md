# 🚀 Quiz Application

Full-stack Interactive Quiz and Real-Time Assessment Platform built with Node.js/Express, React (Vite), MongoDB, and Socket.io.

---

## 🛠️ CI/CD Pipeline & Automated Render Deployment

This repository uses **GitHub Actions** (`.github/workflows/ci-cd.yml`) to automatically test code upon any push or pull request to `main`, and auto-deploy to **Render** via Deploy Hooks when tests pass.

### Workflow Stages:
1. **Backend Tests**: 
   - Spins up an isolated MongoDB container in the runner.
   - Executes backend health, authentication, role authorization, quiz lifecycle, analytics, and security tests (`npm test`).
2. **Frontend Tests & Build**:
   - Executes Vitest frontend unit tests (`npm test`).
   - Verifies the Vite production build (`npm run build`).
3. **Render Auto-Deploy**:
   - Only triggers on successful test runs on the `main` branch.
   - Pings Render's zero-downtime Deploy Hook URLs to trigger production build & redeploy.

---

## 🔑 Setting Up Render Deploy Hooks in GitHub

To enable automated deployments upon git push:

### Step 1: Obtain Deploy Hook from Render
1. Open your [Render Dashboard](https://dashboard.render.com/).
2. Select your **Backend** Web Service.
3. In the left sidebar, navigate to **Settings**.
4. Scroll down to the **Deploy Hook** section and click **Create Deploy Hook** (or copy the existing URL).
5. *(Optional)* If your frontend is also hosted on Render, copy the deploy hook URL for the frontend service as well.

### Step 2: Add Secrets to GitHub Repository
1. Navigate to your GitHub repository: [Quiz-Application](https://github.com/kartik941dev/Quiz-Application).
2. Go to **Settings** > **Secrets and variables** > **Actions**.
3. Click **New repository secret** and add:
   - **`RENDER_BACKEND_DEPLOY_HOOK`**: Paste your Backend Render deploy hook URL.
   - **`RENDER_FRONTEND_DEPLOY_HOOK`** *(Optional)*: Paste your Frontend Render deploy hook URL (if hosted on Render).
4. Click **Add secret**.

Now, whenever you push changes to `main`, GitHub Actions will run all backend and frontend tests and trigger your Render deployment automatically! 🎉

---

## 🧪 Local Testing

### Run Backend Tests:
```bash
cd backend
npm test
```

### Run Frontend Tests:
```bash
cd frontend
npm test
```

### Build Frontend:
```bash
cd frontend
npm run build
```
