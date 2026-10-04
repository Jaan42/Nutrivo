# Nutrivo AI Service

Separate FastAPI service for authenticated Nutrition Facts label extraction. It does not use Firebase Cloud Functions or Firestore, and it never stores uploaded images permanently.

## Security boundary

- The Expo app sends a Firebase ID token and one JPEG, PNG, or WebP image.
- Firebase Admin verifies the token for project `nutrivo-54be2`.
- The Gemini key exists only in this backend's `.env` or the deployment platform's secret manager.
- Uploads are read with an 8 MB default limit, checked against file signatures, passed to Gemini in memory, and closed after the request.
- Gemini is instructed to read only visibly printed label values. Missing or invalid values stay `null`.

## Local setup

Use Python 3.11 or newer.

```powershell
cd C:\Users\John\nutrivo\nutrivo-ai-service
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
```

Edit `.env` manually:

```dotenv
GEMINI_API_KEY=
FIREBASE_PROJECT_ID=nutrivo-54be2
GOOGLE_APPLICATION_CREDENTIALS=C:/secure/path/nutrivo-service-account.json
```

Download the Firebase service-account JSON from Firebase/Google Cloud and keep it outside this repository. On Google Cloud, omit the JSON path and use Application Default Credentials with an appropriately scoped service account.

Start the backend:

```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Health check:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

Expected result: `{"status":"ok"}`.

## Expo development URL

The Expo client defaults to:

- Web/iOS simulator: `http://localhost:8000`
- Android emulator: `http://10.0.2.2:8000`

For a physical device, set the non-secret public base URL before starting Expo:

```powershell
$env:EXPO_PUBLIC_NUTRIVO_AI_URL='http://192.168.1.50:8000'
npx expo start
```

Use the development computer's LAN IP and ensure the firewall permits port 8000. Never put `GEMINI_API_KEY` or Firebase Admin credentials in an `EXPO_PUBLIC_*` value.

## Authenticated extraction test

Obtain a current Firebase ID token from a signed-in test session, then run:

```powershell
$token = 'paste-short-lived-firebase-id-token'
curl.exe -X POST http://localhost:8000/extract-nutrition-label `
  -H "Authorization: Bearer $token" `
  -F "image=@C:\path\to\nutrition-label.jpg;type=image/jpeg"
```

The response contains all schema fields. Unreadable fields are `null`. Never commit or paste a long-lived credential into test scripts.

## Tests

```powershell
pytest -q
```

Unit tests cover health, missing authentication, successful structured output, missing images, MIME rejection, size limits, safe provider errors, and nutrition-value normalization. Real Gemini and valid-token tests remain manual integration tests because they require private credentials.

## CORS and deployment

`ALLOWED_ORIGINS` is a comma-separated list of exact origins. Development also uses `ALLOWED_ORIGIN_REGEX` to allow only `localhost` and `127.0.0.1` over HTTP/HTTPS on changing Expo ports. It does not match other hostnames.

For production, set `ALLOWED_ORIGINS` to the exact deployed HTTPS origins and disable the development regex with an empty value:

```dotenv
ALLOWED_ORIGINS=https://app.example.com
ALLOWED_ORIGIN_REGEX=
```

Bearer authentication does not use cookies, so `allow_credentials` remains disabled. `Authorization` and `Content-Type` are explicitly allowed for the multipart extraction request.

The service can later run on Cloud Run, Render, Railway, Fly.io, or another container/Python host. Use HTTPS, a platform secret manager, request/body limits at the proxy, restricted CORS, Firebase App Check if desired, and a non-public service account file or workload identity.
