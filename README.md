# Telugu Proverbs App

Local setup and run instructions for Windows.

## Project Structure

- `backend/` - FastAPI API
- `frontend/` - React + Vite frontend
- `.venv/` - local Python virtual environment

## Backend Run

### Command Prompt

Open Command Prompt in the project root:

```cmd
cd C:\Users\Lenovo\Desktop\website
```

Activate the virtual environment:

```cmd
.venv\Scripts\activate.bat
```

Install Python dependencies:

```cmd
python -m pip install -r requirements.txt
```

Start the backend:

```cmd
cd backend
python app.py
```

Or run with auto-reload:

```cmd
cd backend
python -m uvicorn app:app --reload
```

### PowerShell

Open PowerShell in the project root:

```powershell
cd C:\Users\Lenovo\Desktop\website
```

If PowerShell blocks virtual environment activation, run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Activate the virtual environment:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install Python dependencies:

```powershell
python -m pip install -r requirements.txt
```

Start the backend:

```powershell
cd backend
python app.py
```

Or run with auto-reload:

```powershell
cd backend
python -m uvicorn app:app --reload
```

Backend URL:

```text
http://127.0.0.1:8000
```

## Frontend Run

Open a second terminal:

### Command Prompt

```cmd
cd C:\Users\Lenovo\Desktop\website\frontend
npm install
npm run dev
```

### PowerShell

```powershell
cd C:\Users\Lenovo\Desktop\website\frontend
npm install
npm run dev
```

Frontend URL:

```text
http://127.0.0.1:5173
```

## Important Notes

- Use `app:app`, not `main:app`, because the backend entry file is `backend/app.py`.
- Use `python -m pip install ...` instead of plain `pip install ...` to make sure packages install into the same Python interpreter you are using to run the app.
- This project contains a `.venv`, so activating it first is the safest way to avoid Python version mismatches.

## Helper Script

To add new proverbs interactively:

### Command Prompt

```cmd
cd C:\Users\Lenovo\Desktop\website
.venv\Scripts\activate.bat
cd backend
python add_proverbs.py
```

### PowerShell

```powershell
cd C:\Users\Lenovo\Desktop\website
.\.venv\Scripts\Activate.ps1
cd backend
python add_proverbs.py
```
## Environment Variables

Create `.env` in project root (you can copy from `.env.example`) and set:

- `MONGODB_URI`
- `OPENAI_API_KEY` (optional)
- `GEMINI_API_KEY` (optional)
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `FRONTEND_ORIGINS` (comma-separated, include your deployed frontend URL)

Create `frontend/.env` (copy from `frontend/.env.example`) and set:

- `VITE_API_URL` (your backend URL, e.g. `https://your-backend.onrender.com`)
