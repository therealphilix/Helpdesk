from pydantic import BaseModel, Field


class DashboardStats(BaseModel):
    total_tickets: int = Field(description="Total tickets excluding new/processing")
    open_tickets: int = Field(description="Tickets with status 'open'")
    ai_resolved_count: int = Field(description="Resolved tickets still assigned to AI")
    ai_resolved_percentage: float = Field(description="Percentage of resolved tickets handled by AI")
    avg_resolution_time_hours: float = Field(description="Average resolution time in hours for resolved tickets")


class TicketsPerDayEntry(BaseModel):
    date: str = Field(description="Date in YYYY-MM-DD format")
    count: int = Field(description="Number of tickets created on this date")


class TicketsPerDayResponse(BaseModel):
    data: list[TicketsPerDayEntry]
