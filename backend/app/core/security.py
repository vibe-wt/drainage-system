from __future__ import annotations

from base64 import urlsafe_b64decode, urlsafe_b64encode
from hashlib import pbkdf2_hmac, sha256
from hmac import compare_digest
from secrets import token_bytes, token_urlsafe


PBKDF2_ITERATIONS = 120_000
SALT_BYTES = 16


def hash_password(password: str) -> str:
    salt = token_bytes(SALT_BYTES)
    digest = pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${urlsafe_b64encode(salt).decode('utf-8')}${urlsafe_b64encode(digest).decode('utf-8')}"


def verify_password(password: str, encoded_hash: str) -> bool:
    try:
        algorithm, iterations, salt, expected_digest = encoded_hash.split("$", 3)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    derived = pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        urlsafe_b64decode(salt.encode("utf-8")),
        int(iterations),
    )
    return compare_digest(urlsafe_b64encode(derived).decode("utf-8"), expected_digest)


def generate_session_token() -> str:
    return token_urlsafe(32)


def hash_session_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()
