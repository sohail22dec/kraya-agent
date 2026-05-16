from fastapi import HTTPException, Request, status
from psycopg_pool import AsyncConnectionPool


async def get_current_user(request: Request) -> dict:
    """
    FastAPI dependency that validates the Better Auth session.
    Reads the Bearer token from the Authorization header (cross-domain safe),
    then falls back to the cookie-based approach for local development.
    Returns the user dict or raises 401.
    """
    session_token = None

    # 1. Try Authorization Bearer header first (works cross-domain)
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        session_token = auth_header[7:]  # Strip "Bearer " prefix
        print(f"[Auth Debug] Using Bearer token: {session_token[:20]}...")

    # 2. Fall back to cookie (for local development)
    if not session_token:
        raw_token = (
            request.cookies.get("better-auth.session_token")
            or request.cookies.get("__Secure-better-auth.session_token")
        )
        session_token = raw_token.split(".")[0] if raw_token else None
        if session_token:
            print(f"[Auth Debug] Using cookie token: {session_token[:20]}...")

    if not session_token:
        print("[Auth Debug] No session token found in headers or cookies.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    pool: AsyncConnectionPool = request.app.state.pool

    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT s."userId", u.email, u.name, u."isAnonymous"
                FROM session s
                JOIN "user" u ON u.id = s."userId"
                WHERE s.token = %s AND s."expiresAt" > NOW()
                """,
                (session_token,),
            )
            row = await cur.fetchone()
            print(f"[Auth Debug] Database lookup result: {row}")

    if not row:
        print("[Auth Debug] Session expired or invalid (not found in DB).")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid",
        )

    user_id, email, name, is_anonymous = row
    return {
        "id": user_id,
        "email": email,
        "name": name,
        "is_anonymous": bool(is_anonymous),
    }


async def get_optional_user(request: Request) -> dict | None:
    """
    Like get_current_user but returns None instead of raising 401.
    Useful for endpoints that work for both authenticated and anonymous users.
    """
    try:
        return await get_current_user(request)
    except HTTPException:
        return None
