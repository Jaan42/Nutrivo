from pathlib import Path
from threading import Lock
from typing import Annotated, Any

import firebase_admin
from fastapi import Depends, Header
from fastapi.concurrency import run_in_threadpool
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
from firebase_admin.exceptions import FirebaseError

from app.config import BACKEND_ROOT, Settings, get_settings
from app.errors import ApiError


_firebase_lock = Lock()


def get_firebase_app(settings: Settings) -> firebase_admin.App:
    try:
        return firebase_admin.get_app()
    except ValueError:
        pass

    with _firebase_lock:
        try:
            return firebase_admin.get_app()
        except ValueError:
            credential = None
            if settings.google_application_credentials:
                credential_path = Path(settings.google_application_credentials).expanduser()
                if not credential_path.is_absolute():
                    credential_path = (BACKEND_ROOT / credential_path).resolve()
                if not credential_path.is_file():
                    raise ApiError(
                        503,
                        "firebase_auth_unavailable",
                        "Firebase Admin credentials are not configured on the server.",
                    )
                credential = credentials.Certificate(str(credential_path))

            try:
                return firebase_admin.initialize_app(
                    credential,
                    {"projectId": settings.firebase_project_id},
                )
            except (FirebaseError, ValueError, OSError) as error:
                raise ApiError(
                    503,
                    "firebase_auth_unavailable",
                    "Firebase token verification is temporarily unavailable.",
                ) from error


async def require_firebase_user(
    authorization: Annotated[str | None, Header()] = None,
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    if not authorization:
        raise ApiError(401, "missing_auth_token", "A Firebase ID token is required.")

    scheme, separator, token = authorization.strip().partition(" ")
    if not separator or scheme.lower() != "bearer" or not token.strip():
        raise ApiError(401, "invalid_auth_header", "Use Authorization: Bearer <token>.")

    try:
        decoded = await run_in_threadpool(
            firebase_auth.verify_id_token,
            token.strip(),
            app=get_firebase_app(settings),
            check_revoked=False,
        )
    except firebase_auth.ExpiredIdTokenError as error:
        raise ApiError(401, "expired_auth_token", "The Firebase ID token has expired.") from error
    except (firebase_auth.InvalidIdTokenError, ValueError) as error:
        raise ApiError(401, "invalid_auth_token", "The Firebase ID token is invalid.") from error
    except FirebaseError as error:
        raise ApiError(
            503,
            "firebase_auth_unavailable",
            "Firebase token verification is temporarily unavailable.",
        ) from error

    if not isinstance(decoded.get("uid"), str) or not decoded["uid"]:
        raise ApiError(401, "invalid_auth_token", "The Firebase ID token is invalid.")
    return decoded
