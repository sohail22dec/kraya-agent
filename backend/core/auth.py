from fastapi import HTTPException, Request, status
from psycopg_pool import AsyncConnectionPool


async def get_current_user(request: Request) -> dict:
    """
    FastAPI dependency that validates the Better Auth session cookie
    by querying the shared PostgreSQL session table directly.
    Returns the user dict or raises 401.
    """
    # Better Auth sets a cookie named 'better-auth.session_token'
    # On HTTPS (production), it often adds a '__Secure-' prefix.
    raw_token = request.cookies.get("better-auth.session_token") or request.cookies.get("__Secure-better-auth.session_token")
    session_token = raw_token.split(".")[0] if raw_token else None
    
    print(f"[Auth Debug] Incoming session token: {session_token}")

    if not session_token:
        print("[Auth Debug] No session token found in cookies.")
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
