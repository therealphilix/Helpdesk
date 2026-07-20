import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    AGENT = "agent"


class TicketStatus(str, enum.Enum):
    OPEN = "open"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketCategory(str, enum.Enum):
    GENERAL_QUESTION = "general question"
    TECHNICAL_QUESTION = "technical question"
    REFUND_REQUEST = "refund request"
