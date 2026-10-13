from django.http import JsonResponse
from django.db import connection


def health_check(request):
    """
    Production health-check endpoint.
    Verifies database connectivity and returns system status.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        db_status = "connected"
        status_code = 200
    except Exception as exc:
        db_status = f"disconnected: {type(exc).__name__}"
        status_code = 503

    return JsonResponse(
        {
            "status": "healthy" if status_code == 200 else "unhealthy",
            "database": db_status,
        },
        status=status_code,
    )
