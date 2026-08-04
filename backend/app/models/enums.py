import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    AGENT = "agent"


class TicketStatus(str, enum.Enum):
    NEW = "new"
    PROCESSING = "processing"
    OPEN = "open"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketCategory(str, enum.Enum):
    GENERAL_QUESTION = ("general question", "General inquiries")
    TECHNICAL_QUESTION = ("technical question", "Technical issues with software, hardware, or online platforms")
    REFUND_REQUEST = ("refund request", "Requests for refunds, billing issues, or payment problems")

    def __new__(cls, value: str, description: str) -> "TicketCategory":
        obj = str.__new__(cls, value)
        obj._value_ = value
        obj.description = description
        return obj


class SenderType(str, enum.Enum):
    AGENT = "agent"
    CUSTOMER = "customer"
