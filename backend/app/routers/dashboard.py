import logging

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.dependencies import get_current_user
from ..models.user import User
from ..schemas.dashboard import DashboardStats, TicketsPerDayEntry, TicketsPerDayResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    result = await db.execute(text("SELECT * FROM get_dashboard_stats()"))
    row = result.one()

    return DashboardStats(
        total_tickets=row.total_tickets,
        open_tickets=row.open_tickets,
        ai_resolved_count=row.ai_resolved_count,
        ai_resolved_percentage=float(row.ai_resolved_percentage or 0),
        avg_resolution_time_hours=float(row.avg_resolution_time_hours or 0),
    )


@router.get("/tickets-per-day", response_model=TicketsPerDayResponse)
async def tickets_per_day(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    result = await db.execute(text("SELECT * FROM get_tickets_per_day()"))
    rows = result.all()

    entries = [
        TicketsPerDayEntry(date=row.date, count=row.count)
        for row in rows
    ]
    return TicketsPerDayResponse(data=entries)
