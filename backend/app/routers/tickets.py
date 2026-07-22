from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from ..core.database import get_db
from ..core.dependencies import get_current_user
from ..models.ticket import Ticket
from ..models.user import User
from ..schemas.ticket import TicketListOut

router = APIRouter()


@router.get("", response_model=list[TicketListOut])
async def list_tickets(
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Ticket)
        .options(joinedload(Ticket.assignee))
        .order_by(Ticket.created_at.desc())
    )
    return result.scalars().all()
