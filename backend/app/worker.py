from .core.config import settings
from .services.ticket_classification import classify_ticket
from .services.ticket_auto_resolve import auto_resolve_ticket

redis_settings = settings.arq_redis_settings()


class WorkerSettings:
    functions = [classify_ticket, auto_resolve_ticket]
    redis_settings = redis_settings
    max_jobs = 10
    job_timeout = 30
    max_tries = 3
    keep_result = 0
