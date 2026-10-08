# Nutrivo

Nutrivo is an Expo and React Native nutrition tracker for Android and web. It supports Firebase Authentication, nutrition-profile targets, manual food logging, authenticated Nutrition Facts extraction, daily history, and seven-day insights.

## Prerequisites

- Node.js and npm
- An Android emulator or physical device for Android testing
- Python 3.11 or newer for the optional AI extraction backend
- A configured Firebase project

Install frontend dependencies:

```powershell
npm install
```

## AI backend

The authenticated FastAPI service lives in `nutrivo-ai-service`. Its setup, environment variables, security boundary, and test commands are documented in [`nutrivo-ai-service/README.md`](nutrivo-ai-service/README.md).

Start it locally before demonstrating Nutrition Facts extraction:

```powershell
cd nutrivo-ai-service
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Keep Gemini and Firebase Admin credentials in the backend `.env` or a deployment secret manager. Never place them in an `EXPO_PUBLIC_*` variable.

## Run the app

From the repository root, start Expo web:

```powershell
npx expo start --web
```

Start a configured Android emulator, then run:

```powershell
npx expo run:android
```

Android emulators use `http://10.0.2.2:8000` for the AI backend by default. Web uses `http://localhost:8000`. For a physical Android device, set the public, non-secret backend base URL before starting Expo:

```powershell
$env:EXPO_PUBLIC_NUTRIVO_AI_URL='http://192.168.1.50:8000'
npx expo start
```

## Validation

```powershell
npx tsc --noEmit
npx expo lint
npx expo-doctor
npx expo export --platform web
npx expo export --platform android
```

Run backend tests separately:

```powershell
cd nutrivo-ai-service
.\.venv\Scripts\python.exe -m pytest -q
```

Application routes live under `src/app`. Shared components, hooks, services, types, and deterministic calculation utilities live in their corresponding `src` folders.
