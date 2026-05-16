from fastapi import HTTPException, Request, status
import httpx
import os


BETTER_AUTH_URL = os.getenv("BETTER_AUTH_URL", "http://localhost:3000")


async def get_current_user(request: Request) -> dict:
    """
    FastAPI dependency that validates the Better Auth session by calling
    the Better Auth /api/auth/get-session endpoint on the frontend.
    This is the correct approach for cross-domain auth (Vercel + Render).
    Returns the user dict or raises 401.
    """
    # Forward all cookies from the incoming request to Better Auth
    cookie_header = request.headers.get("cookie", "")

    print(f"[Auth Debug] Forwarding cookie header: {cookie_header[:80]}...")

    if not cookie_header:
        print("[Auth Debug] No cookies found in request.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{BETTER_AUTH_URL}/api/auth/get-session",
                headers={"cookie": cookie_header},
                timeout=10.0,
            )
        except httpx.RequestError as e:
            print(f"[Auth Debug] Failed to reach Better Auth: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Auth service unreachable",
            )

    print(f"[Auth Debug] Better Auth response status: {resp.status_code}")

    if resp.status_code != 200:
        print(f"[Auth Debug] Better Auth returned non-200: {resp.text}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid",
        )

    data = resp.json()
    print(f"[Auth Debug] Session data: {data}")

    if not data or not data.get("user"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid",
        )

    user = data["user"]
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "name": user.get("name"),
        "is_anonymous": user.get("isAnonymous", False),
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
