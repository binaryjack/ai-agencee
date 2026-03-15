"""Pydantic v2 data models for the ai-agencee HTTP API."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class RunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RunOutcome(BaseModel):
    verdict: str  # "pass" | "fail" | "warn"
    summary: str
    details: dict[str, Any] = Field(default_factory=dict)
    cost_usd: float | None = None
    tokens_used: int | None = None
    created_at: datetime | None = None


class RunEvent(BaseModel):
    type: str  # "lane:start" | "lane:end" | "budget:exceeded" | "run:end"
    lane_id: str | None = None
    run_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime | None = None


class Run(BaseModel):
    id: str
    dag_id: str
    status: RunStatus
    tenant_id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    outcome: RunOutcome | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
