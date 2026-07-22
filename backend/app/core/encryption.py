"""Fernet-based encryption for sensitive server credentials."""

from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from app.config import get_settings


def _get_fernet() -> Fernet:
    return Fernet(get_settings().ENCRYPTION_KEY.encode())


def encrypt_value(plaintext: str) -> str:
    """Encrypt a string and return the ciphertext as a UTF-8 string."""
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    """Decrypt a ciphertext string back to plaintext."""
    try:
        return _get_fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken as exc:
        raise ValueError("Failed to decrypt value — wrong key or corrupted data") from exc
