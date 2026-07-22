from fastapi import APIRouter, Depends, Query
from sqlalchemy import asc, desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from ..core.database import get_db
from ..core.dependencies import get_current_user
from ..models.enums import TicketCategory, TicketStatus
from ..models.ticket import Ticket
from ..models.user import User
from ..schemas.ticket import TicketListOut

router = APIRouter()

_SORT_COLUMNS = {
    "sender_email": Ticket.sender_email,
    "sender_name": Ticket.sender_name,
    "subject": Ticket.subject,
    "status": Ticket.status,
    "category": Ticket.category,
    "created_at": Ticket.created_at,
    "updated_at": Ticket.updated_at,
    "assignee_name": User.name,
}


@router.get("", response_model=list[TicketListOut])
async def list_tickets(
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    sort_by: str = Query(default="created_at", enum=list(_SORT_COLUMNS.keys())),
    sort_dir: str = Query(default="desc", enum=["asc", "desc"]),
    status: TicketStatus | None = Query(default=None),
    category: TicketCategory | None = Query(default=None),
    search: str | None = Query(default=None, min_length=1),
):
    sort_column = _SORT_COLUMNS[sort_by]
    direction = desc if sort_dir == "desc" else asc

    query = select(Ticket).options(joinedload(Ticket.assignee))

    if sort_by == "assignee_name":
        query = query.outerjoin(Ticket.assignee)

    if status is not None:
        query = query.where(Ticket.status == status)

    if category is not None:
        query = query.where(Ticket.category == category)

    if search is not None:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                Ticket.sender_email.ilike(pattern),
                Ticket.sender_name.ilike(pattern),
                Ticket.subject.ilike(pattern),
            )
        )

    result = await db.execute(query.order_by(direction(sort_column)))
    return result.scalars().all()
