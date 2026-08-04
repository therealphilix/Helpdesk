"""add_dashboard_stored_functions

Revision ID: 1105abbb0f77
Revises: 52eb5882ff97
Create Date: 2026-08-04 19:22:33.067997
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '1105abbb0f77'
down_revision: Union[str, None] = '52eb5882ff97'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE OR REPLACE FUNCTION get_dashboard_stats()
        RETURNS TABLE(
            total_tickets bigint,
            open_tickets bigint,
            ai_resolved_count bigint,
            ai_resolved_percentage numeric,
            avg_resolution_time_hours numeric
        ) AS $$
        DECLARE
            ai_user_id uuid;
        BEGIN
            SELECT id INTO ai_user_id FROM users WHERE email = 'ai@helpdesk.com';

            RETURN QUERY
            SELECT
                COUNT(*) FILTER (WHERE t.status NOT IN ('new', 'processing'))::bigint,
                COUNT(*) FILTER (WHERE t.status = 'open')::bigint,
                COUNT(*) FILTER (WHERE t.status = 'resolved' AND t.assigned_to = ai_user_id)::bigint,
                CASE
                    WHEN COUNT(*) FILTER (WHERE t.status = 'resolved') > 0
                    THEN ROUND(
                        COUNT(*) FILTER (WHERE t.status = 'resolved' AND t.assigned_to = ai_user_id)::numeric
                        / COUNT(*) FILTER (WHERE t.status = 'resolved')::numeric * 100, 2
                    )
                    ELSE 0
                END,
                ROUND(
                    COALESCE(
                        AVG(
                            EXTRACT(EPOCH FROM (t.updated_at - t.created_at)) / 3600
                        ) FILTER (WHERE t.status = 'resolved'),
                        0
                    )::numeric, 2
                )
            FROM tickets t;
        END;
        $$ LANGUAGE plpgsql;
    """)

    op.execute("""
        CREATE OR REPLACE FUNCTION get_tickets_per_day()
        RETURNS TABLE(
            date text,
            count bigint
        ) AS $$
        BEGIN
            RETURN QUERY
            WITH date_series AS (
                SELECT generate_series(
                    CURRENT_DATE - INTERVAL '29 days',
                    CURRENT_DATE,
                    '1 day'::interval
                )::date AS day
            )
            SELECT
                ds.day::text,
                COUNT(t.id)::bigint
            FROM date_series ds
            LEFT JOIN tickets t ON DATE(t.created_at) = ds.day
            GROUP BY ds.day
            ORDER BY ds.day;
        END;
        $$ LANGUAGE plpgsql;
    """)


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS get_dashboard_stats();")
    op.execute("DROP FUNCTION IF EXISTS get_tickets_per_day();")
