import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from openai import AsyncOpenAI
from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from ..core.config import settings
from ..core.database import get_db
from ..core.dependencies import get_current_user
from ..models.enums import SenderType, TicketCategory, TicketStatus, UserRole
from ..models.ticket import Ticket
from ..models.ticket_reply import TicketReply
from ..models.user import User
from ..schemas.reply import PolishRequest, PolishResponse, ReplyCreate, ReplyOut
from ..schemas.ticket import AgentOut, SummarizeResponse, TicketDetailOut, TicketPaginatedOut, TicketUpdate

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
    query = query.where(Ticket.status.notin_([TicketStatus.NEW, TicketStatus.PROCESSING]))
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
        .where(User.role == UserRole.AGENT, User.deleted_at.is_(None), User.email != "ai@helpdesk.com")
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
    request: Request = None,
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

    try:
        arq_redis = getattr(request.app.state, "arq_redis", None) if request else None
        if arq_redis:
            await arq_redis.enqueue_job("send_reply_email", ticket_id, body.body_text, body.body_html)
    except Exception:
        pass

    return reply


@router.post("/{ticket_id}/replies/polish", response_model=PolishResponse)
async def polish_reply(
    ticket_id: uuid.UUID,
    body: PolishRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")

    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    client = AsyncOpenAI(
        api_key=settings.OPENAI_API_KEY,
        base_url=settings.OPENAI_BASE_URL,
    )

    system_prompt = (
        "You are a helpful assistant that improves support replies written by a customer support agent. "
        "Polish the draft reply to be clearer, more professional, and more helpful. "
        "Fix any grammar or spelling errors. Keep the tone warm and empathetic. "
        "Do not add information the agent didn't include. Preserve the original meaning. "
        "Return only the polished reply text, without any prefixes, explanations, or markdown formatting."
    )

    try:
        first_name = ticket.sender_name.split(" ")[0] if ticket.sender_name else "there"
        salutation = f"Hi {first_name},\n\n"
        signature = f"\n\nBest regards,\n{current_user.name}\nhttps://helpdesk.com"
        draft = body.draft.removeprefix(salutation).removesuffix(signature)

        user_message = (
            f"Ticket subject: {ticket.subject}\n"
            f"Ticket body: {ticket.body_text}\n"
            f"Category: {ticket.category or 'N/A'}\n"
            f"\n"
            f"Agent's draft reply:\n{draft}"
        )

        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.7,
            max_tokens=2048,
        )
        polished = response.choices[0].message.content or draft
        return PolishResponse(polished=salutation + polished.strip() + signature)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI polish failed: {str(e)}")


@router.post("/{ticket_id}/summarize", response_model=SummarizeResponse)
async def summarize_ticket(
    ticket_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")

    query = (
        select(Ticket)
        .options(
            selectinload(Ticket.replies).joinedload(TicketReply.author),
        )
        .where(Ticket.id == ticket_id)
    )
    result = await db.execute(query)
    ticket = result.scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    transcript_lines = [
        f"Subject: {ticket.subject}",
        f"From: {ticket.sender_name or ticket.sender_email} ({ticket.sender_email})",
        f"Category: {ticket.category or 'N/A'}",
        f"Status: {ticket.status}",
        f"",
        f"--- Original Message ---",
        ticket.body_text,
    ]

    if ticket.replies:
        transcript_lines.append("")
        transcript_lines.append("--- Replies ---")
        for reply in ticket.replies:
            sender = reply.author.name if reply.author else ticket.sender_name or ticket.sender_email
            role = "Agent" if reply.sender_type == SenderType.AGENT else "Customer"
            transcript_lines.append(f"[{role}] {sender}: {reply.body_text}")

    transcript = "\n".join(transcript_lines)

    client = AsyncOpenAI(
        api_key=settings.OPENAI_API_KEY,
        base_url=settings.OPENAI_BASE_URL,
    )

    system_prompt = (
        "You are a helpful assistant that summarizes support ticket conversations. "
        "Write a concise summary covering: 1) the customer's issue, "
        "2) what has been discussed and suggested so far, "
        "3) the current status and any next steps needed. "
        "Keep the summary to 3-5 sentences. "
        "Return only the summary text, without any prefixes, explanations, or markdown formatting."
    )

    try:
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Summarize this ticket conversation:\n\n{transcript}"},
            ],
            temperature=0.5,
            max_tokens=1024,
        )
        summary = response.choices[0].message.content or "Unable to generate summary."
        return SummarizeResponse(summary=summary.strip())
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI summarize failed: {str(e)}")
