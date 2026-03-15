"""LangChain tool integration for ai-agencee.

Install optional dependency::

    pip install ai-agencee[langchain]
"""
from __future__ import annotations

from typing import Any, Optional, Type

try:
    from langchain_core.tools import BaseTool  # type: ignore[import-untyped]
    from pydantic import BaseModel, Field as PydanticField
    _HAS_LANGCHAIN = True
except ImportError:
    _HAS_LANGCHAIN = False

from .client import AiAgenceeClient


if _HAS_LANGCHAIN:

    class _AiAgenceeRunInput(BaseModel):
        dag_id: str = PydanticField(description="The DAG ID to execute")
        inputs: dict[str, Any] = PydanticField(
            default_factory=dict,
            description="Input parameters for the DAG run",
        )
        timeout: float = PydanticField(
            default=300.0,
            description="Maximum seconds to wait for the run to complete",
        )

    class AiAgenceeRunTool(BaseTool):
        """LangChain tool that submits and awaits an ai-agencee DAG run.

        Usage::

            tool = AiAgenceeRunTool(
                client=AiAgenceeClient("https://api.example.com", api_key="sk-...")
            )
            result = await tool.arun({"dag_id": "my-dag", "inputs": {"repo": "acme/app"}})
        """

        name: str = "ai_agencee_run"
        description: str = (
            "Submit and execute an ai-agencee multi-agent DAG. "
            "Returns the verdict (pass/fail/warn) and summary from the run outcome."
        )
        args_schema: Type[BaseModel] = _AiAgenceeRunInput

        # Pydantic field for the client — use Any to avoid BaseModel validation issues
        client: Any = PydanticField(exclude=True)

        class Config:
            arbitrary_types_allowed = True

        async def _arun(
            self,
            dag_id: str,
            inputs: dict[str, Any] | None = None,
            timeout: float = 300.0,
            **_: Any,
        ) -> str:
            run = await self.client.run_dag(
                dag_id, inputs=inputs or {}, timeout=timeout
            )
            if run.outcome:
                return (
                    f"verdict={run.outcome.verdict} | "
                    f"summary={run.outcome.summary}"
                )
            return f"run_id={run.id} status={run.status}"

        def _run(self, *args: Any, **kwargs: Any) -> str:  # pragma: no cover
            raise NotImplementedError("Use arun() for async execution")

else:

    def AiAgenceeRunTool(*args: Any, **kwargs: Any) -> None:  # type: ignore[misc]
        raise ImportError(
            "langchain-core is required for AiAgenceeRunTool. "
            "Install it with: pip install ai-agencee[langchain]"
        )
