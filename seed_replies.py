import asyncio
import os
import sys
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from sqlalchemy import select

from backend.app.core.database import async_session
from backend.app.models import Ticket, TicketReply, User
from backend.app.models.enums import SenderType

TICKET_ID = "8ba5ebe9-028f-4a2e-9d1d-07e2eb30bf54"

AGENT_REPLIES = [
    """Thank you for reaching out to us regarding your issue with accessing
course materials for CS101. I understand how frustrating this can be,
especially when you have assignments and deadlines approaching.

Let me start by asking a few clarifying questions to help diagnose
the problem. Could you let me know which browser you are using and
whether you have tried accessing the portal from a different device?

In the meantime, I would recommend clearing your browser cache and
cookies, as cached credentials sometimes cause access conflicts.
Also, please ensure you are logging in with your university SSO.""",

    """Thank you for providing those details. Since the issue persists across
both Chrome and Firefox, it does not appear to be browser-specific.

Let me check your account permissions on our end. I have pulled up
your student profile and can see that you are enrolled in CS101
for the current semester, so you should have access.

One thing that stands out is that your SSO token was last refreshed
over two weeks ago. This can sometimes cause authentication issues
with the course portal. I have manually triggered a token refresh
on your account. Could you try logging in again now?""",

    """The error code ERR_LMS_403 is helpful — that is an authorization
error specific to our learning management system. It typically means
your account has the correct enrollment but the course materials
section has not been provisioned for your profile yet.

I have checked with the IT provisioning team and they confirmed that
a batch of student profiles from the late registration period did not
get their LMS course mappings applied. Your account is in that batch.

I have submitted a manual provisioning request with high priority.
The provisioning team typically processes these within 2-4 hours.
I will follow up with you as soon as I receive confirmation.""",

    """I just received confirmation from the provisioning team that your
CS101 course materials access has been activated on your profile.

You should now see the course materials section in your dashboard
when you log in. The full set of materials should be available:
lecture slides, assignments, readings, and discussion forums.

Please take a moment to verify that you can see all of these sections.
If anything is still missing or if you encounter any other issues,
do not hesitate to let me know. I will keep this ticket open for
the next 48 hours in case you need any further assistance.""",

    """You are very welcome! I am glad everything is working now.

As a quick tip, the CS101 discussion forum is an excellent resource
if you ever have questions about specific assignments. The teaching
assistants monitor it daily and are very responsive.

Also, make sure you have notifications enabled in your LMS settings
so you receive alerts when new materials or announcements are posted.
You can find this under Profile → Notification Preferences.

If you run into any other issues down the road, please feel free to
open a new ticket and reference this one. We are happy to help.""",
]

CUSTOMER_REPLIES = [
    """Hi, I am having trouble accessing my course materials for CS101 on
the university portal. Every time I try to click on the course page,
I get redirected back to the dashboard with an error message that
says "You do not have permission to view this content."

I have tried using both Chrome and Firefox, and I also tried on my
phone, but the same thing happens on all devices. I am definitely
enrolled in the course because I can see it in my enrollment list.

I have an assignment due this Friday and I really need to access
the lecture slides and reading materials. Can you please help?""",

    """Thanks for the quick response. I have cleared my browser cache and
cookies as you suggested, and I also tried logging in from my laptop
instead of my desktop, but the issue is still the same.

I am using the university SSO login (the one with our student ID
and password), and I can log in fine — I can see my dashboard and
my enrolled courses, but as soon as I click on CS101 to open the
course materials, I get the access denied error.

The exact error message is: "Error: ERR_LMS_403 — You do not have
permission to view this content. Contact your administrator."

What should I do next? Is there a way to escalate this?""",

    """I just tried again and it works now! I can see all the course
materials — the lecture slides, assignments, and reading list are
all there. I had no idea the issue was related to late registration
provisioning, but that makes sense because I did register a few
days after the official enrollment period ended.

Thank you so much for looking into this and getting it resolved so
quickly. I really appreciate that you followed up with the IT team
and kept me updated throughout the process.

The Friday deadline is still tight, but at least now I can access
everything I need. Please go ahead and close this ticket.""" ,
]

AGENT_REPLIES_2 = [
    """I wanted to follow up and check in on how things are going with
your CS101 course. It has been about a week since we resolved
the access issue, and I hope everything has been smooth since.

If you have had a chance to catch up on the materials, I would
love to hear your feedback on the overall experience. Our team
is always looking for ways to improve the onboarding process,
especially for students who register during the late period.

Are there any other courses where you are experiencing similar
issues, or was CS101 the only one affected? Sometimes the
provisioning delay can impact multiple courses if you registered
for several during the same late enrollment window.

Either way, please let me know if there is anything else I can
assist you with. We are here to help.""",

    """Before we close out this ticket, I wanted to make sure you are
aware of a few additional resources that might be helpful for
your CS101 course and future semesters.

First, the university IT help desk has a knowledge base with
articles covering common issues like password resets, software
installation, and VPN setup. You can find it under the Help
section of the student portal.

Second, if you ever need technical support outside of business
hours, we have a 24/7 chatbot on the portal that can answer
basic questions and create tickets on your behalf.

Finally, I noticed your account still had the old notification
settings. I took the liberty of enabling email notifications
for assignment deadlines and course announcements. You can
adjust these anytime in your profile settings.

Thank you for your patience throughout this process.""",
]

CUSTOMER_REPLIES_2 = [
    """Hi again! Everything has been great so far. I managed to catch up
on the lectures and even submitted my assignment on time. Thanks
again for helping me get access sorted out so quickly.

To answer your question, CS101 was the only course where I had
this issue. All my other courses (ENG201, MATH150, and HIST110)
were accessible right from the start. It was just CS101 that
had the provisioning delay because of the late registration.

I think the process could be improved if the system automatically
sent a notification when provisioning is delayed. A few days of
not knowing what was going on was a bit stressful. But otherwise,
the support experience was excellent.

Thanks for checking in — I really appreciate the follow-up.""",

    """That is very helpful, thank you! I did not know about the 24/7
chatbot — that will definitely come in handy during late night
study sessions when the help desk is closed.

And thank you for enabling the deadline notifications. I actually
did not realize those were off, so that is going to save me from
some last-minute scrambles in the future.

I think we can go ahead and close this ticket now. Everything is
resolved and I have all the information I need to avoid issues
in the future. Thanks again for the thorough support and all the
helpful tips about the portal features.

Have a great week!""",
]

ALL_AGENT = AGENT_REPLIES + AGENT_REPLIES_2
ALL_CUSTOMER = CUSTOMER_REPLIES + CUSTOMER_REPLIES_2


async def seed():
    async with async_session() as db:
        ticket = await db.get(Ticket, uuid.UUID(TICKET_ID))
        if not ticket:
            print(f"Error: Ticket {TICKET_ID} not found.")
            sys.exit(1)

        print(f"Found ticket: {ticket.subject}")

        result = await db.execute(select(User).limit(1))
        user = result.scalar_one_or_none()
        if not user:
            print("Error: No users found in the database.")
            sys.exit(1)

        print(f"Using user: {user.name} ({user.email}) as agent author")

        result = await db.execute(
            select(TicketReply).where(TicketReply.ticket_id == uuid.UUID(TICKET_ID))
        )
        existing_count = len(result.scalars().all())
        print(f"Existing replies: {existing_count}")

        for i in range(20):
            is_agent = i % 2 == 0
            reply_index = i // 2

            if is_agent:
                body = ALL_AGENT[reply_index % len(ALL_AGENT)]
                sender_type = SenderType.AGENT
                author_id = user.id
            else:
                body = ALL_CUSTOMER[reply_index % len(ALL_CUSTOMER)]
                sender_type = SenderType.CUSTOMER
                author_id = None

            reply = TicketReply(
                ticket_id=uuid.UUID(TICKET_ID),
                author_id=author_id,
                sender_type=sender_type,
                body_text=body.strip(),
            )
            db.add(reply)
            print(f"  Created reply #{i + 1}: {sender_type.value}")

        await db.commit()
        print(f"\nDone. Created 20 replies for ticket {TICKET_ID}.")


if __name__ == "__main__":
    asyncio.run(seed())
