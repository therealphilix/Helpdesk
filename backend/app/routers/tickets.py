import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from ..core.database import get_db
from ..core.dependencies import get_current_user
from ..models.enums import SenderType, TicketCategory, TicketStatus, UserRole
from ..models.ticket import Ticket
from ..models.ticket_reply import TicketReply
from ..models.user import User
from ..schemas.reply import ReplyCreate, ReplyOut
from ..schemas.ticket import AgentOut, TicketDetailOut, TicketPaginatedOut, TicketUpdate

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


def _build_filter(query, status, category, search):
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
    return query


@router.get("", response_model=TicketPaginatedOut)
async def list_tickets(
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    sort_by: str = Query(default="created_at", enum=list(_SORT_COLUMNS.keys())),
    sort_dir: str = Query(default="desc", enum=["asc", "desc"]),
    status: TicketStatus | None = Query(default=None),
    category: TicketCategory | None = Query(default=None),
    search: str | None = Query(default=None, min_length=1),
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    sort_column = _SORT_COLUMNS[sort_by]
    direction = desc if sort_dir == "desc" else asc

    count_query = select(func.count()).select_from(Ticket)
    count_query = _build_filter(count_query, status, category, search)
    total = await db.scalar(count_query) or 0

    query = select(Ticket).options(joinedload(Ticket.assignee))

    if sort_by == "assignee_name":
        query = query.outerjoin(Ticket.assignee)

    query = _build_filter(query, status, category, search)

    result = await db.execute(
        query.order_by(direction(sort_column)).offset(offset).limit(limit)
    )
    items = list(result.scalars().all())

    return TicketPaginatedOut(items=items, total=total)


@router.get("/agents", response_model=list[AgentOut])
async def list_agents(
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User)
        .where(User.role == UserRole.AGENT, User.deleted_at.is_(None))
        .order_by(User.name)
    )
    return result.scalars().all()


@router.get("/{ticket_id}", response_model=TicketDetailOut)
async def get_ticket(
    ticket_id: uuid.UUID,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Ticket)
        .options(
            joinedload(Ticket.assignee),
            selectinload(Ticket.replies).joinedload(TicketReply.author),
        )
        .where(Ticket.id == ticket_id)
    )
    result = await db.execute(query)
    ticket = result.scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.patch("/{ticket_id}", response_model=TicketDetailOut)
async def update_ticket(
    ticket_id: uuid.UUID,
    body: TicketUpdate,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Ticket)
        .options(
            joinedload(Ticket.assignee),
            selectinload(Ticket.replies).joinedload(TicketReply.author),
        )
        .where(Ticket.id == ticket_id)
    )
    result = await db.execute(query)
    ticket = result.scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    update_data = body.model_dump(exclude_unset=True)

    if "assigned_to" in update_data:
        if body.assigned_to is not None:
            user_result = await db.execute(
                select(User).where(User.id == body.assigned_to, User.deleted_at.is_(None))
            )
            if not user_result.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Assigned user not found")
        ticket.assigned_to = body.assigned_to

    if "status" in update_data:
        ticket.status = body.status

    if "category" in update_data:
        ticket.category = body.category

    await db.commit()

    query = (
        select(Ticket)
        .options(
            joinedload(Ticket.assignee),
            selectinload(Ticket.replies).joinedload(TicketReply.author),
        )
        .where(Ticket.id == ticket_id)
        .execution_options(populate_existing=True)
    )
    result = await db.execute(query)
    return result.scalars().first()


@router.get("/{ticket_id}/replies", response_model=list[ReplyOut])
async def list_replies(
    ticket_id: uuid.UUID,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(TicketReply)
        .options(joinedload(TicketReply.author))
        .where(TicketReply.ticket_id == ticket_id)
        .order_by(TicketReply.created_at)
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/{ticket_id}/replies", response_model=ReplyOut, status_code=201)
async def create_reply(
    ticket_id: uuid.UUID,
    body: ReplyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    reply = TicketReply(
        ticket_id=ticket_id,
        author_id=current_user.id,
        sender_type=SenderType.AGENT,
        body_text=body.body_text,
        body_html=body.body_html,
    )
    db.add(reply)
    await db.commit()
    await db.refresh(reply)

    author = await db.get(User, current_user.id)
    reply.author = author

    return reply
