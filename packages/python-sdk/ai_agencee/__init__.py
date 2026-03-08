"""
ai-agencee SDK — Python thin wrapper around the ai-kit CLI.

Requires Node.js 20+ with the ai-kit CLI installed globally or via npx.

Install:
    pip install ai-agencee

Usage:
    from ai_agencee import run_dag, list_agents

    result = run_dag("agents/dag.json", project_root=".")
    print(result["summary"])
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

__version__ = "0.1.0"
__all__ = [
    "run_dag",
    "list_agents",
    "AiAgenceeError",
    "CliNotFoundError",
]


# ─── Exceptions ───────────────────────────────────────────────────────────────


class AiAgenceeError(RuntimeError):
    """Raised when the ai-kit CLI exits with a non-zero status."""

    def __init__(self, message: str, returncode: int, stderr: str) -> None:
        super().__init__(message)
        self.returncode = returncode
        self.stderr = stderr


class CliNotFoundError(AiAgenceeError):
    """Raised when neither 'ai-kit' nor 'npx' can be found on PATH."""

    def __init__(self) -> None:
        super().__init__(
            "Could not locate 'ai-kit' or 'npx' on PATH. "
            "Install Node.js 20+ and run: npm install -g @ai-agencee/cli",
            returncode=-1,
            stderr="",
        )


# ─── CLI discovery ────────────────────────────────────────────────────────────


def _cli_argv() -> list[str]:
    """Return the base command to invoke ai-kit.

    Priority:
      1. ai-kit binary (installed globally via npm/pnpm)
      2. npx ai-kit  (uses local/cached package, Node.js must be on PATH)
    """
    if shutil.which("ai-kit"):
        return ["ai-kit"]
    if shutil.which("npx"):
        return ["npx", "--yes", "@ai-agencee/cli"]
    raise CliNotFoundError()


# ─── Core helper ─────────────────────────────────────────────────────────────


def _run_cli(
    args: list[str],
    *,
    project_root: str | Path = ".",
    timeout: int = 300,
    env: dict[str, str] | None = None,
) -> Any:
    """Execute the ai-kit CLI with *args* and return the parsed JSON output.

    Parameters
    ----------
    args:
        CLI sub-command arguments, e.g. ``["run", "agents/dag.json"]``.
    project_root:
        Working directory for the CLI process.
    timeout:
        Maximum seconds to wait for the process to complete.
    env:
        Extra environment variables merged into the current environment.

    Returns
    -------
    Parsed JSON output as a dict/list, or the raw stdout string if the output
    is not valid JSON.

    Raises
    ------
    AiAgenceeError
        If the CLI exits with a non-zero status.
    CliNotFoundError
        If ai-kit / npx cannot be found on PATH.
    """
    import os

    base = _cli_argv()
    cmd = base + args + ["--json"]

    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)

    try:
        result = subprocess.run(
            cmd,
            cwd=str(project_root),
            capture_output=True,
            text=True,
            timeout=timeout,
            env=merged_env,
        )
    except FileNotFoundError as exc:
        raise CliNotFoundError() from exc
    except subprocess.TimeoutExpired as exc:
        raise AiAgenceeError(
            f"ai-kit timed out after {timeout}s",
            returncode=-1,
            stderr="",
        ) from exc

    if result.returncode != 0:
        raise AiAgenceeError(
            f"ai-kit exited with code {result.returncode}: {result.stderr.strip()}",
            returncode=result.returncode,
            stderr=result.stderr,
        )

    stdout = result.stdout.strip()
    # The CLI may emit progress lines before the final JSON; find the last
    # JSON object/array in the output.
    for line in reversed(stdout.splitlines()):
        stripped = line.strip()
        if stripped.startswith(("{", "[")):
            try:
                return json.loads(stripped)
            except json.JSONDecodeError:
                pass

    # If no JSON found, return raw stdout
    return stdout


# ─── Public API ──────────────────────────────────────────────────────────────


def run_dag(
    dag_file: str | Path,
    *,
    project_root: str | Path = ".",
    budget_usd: float | None = None,
    provider: str | None = None,
    tenant_id: str | None = None,
    timeout: int = 300,
) -> dict[str, Any]:
    """Run a DAG pipeline and return the result as a dict.

    Parameters
    ----------
    dag_file:
        Path to the DAG JSON file, relative to *project_root*.
    project_root:
        Root directory of the project to analyse.
    budget_usd:
        Optional per-run USD budget cap (overrides model-router.json setting).
    provider:
        Force a specific LLM provider (``"anthropic"``, ``"openai"``, ``"mock"``).
    tenant_id:
        Tenant identifier for multi-tenant isolation (sets AIKIT_TENANT_ID).
    timeout:
        Maximum seconds to wait for the run to complete.

    Returns
    -------
    dict
        The completed run result, including ``summary``, ``findings``,
        ``recommendations``, and ``cost`` fields.

    Examples
    --------
    >>> from ai_agencee import run_dag
    >>> result = run_dag("agents/dag.json", project_root="/my/project")
    >>> print(result["summary"])
    """
    args = ["run", str(dag_file)]
    if budget_usd is not None:
        args += ["--budget", str(budget_usd)]
    if provider is not None:
        args += ["--provider", provider]

    env: dict[str, str] = {}
    if tenant_id is not None:
        env["AIKIT_TENANT_ID"] = tenant_id

    return _run_cli(args, project_root=project_root, timeout=timeout, env=env)


def list_agents(
    *,
    project_root: str | Path = ".",
) -> list[dict[str, Any]]:
    """Return a list of agent definitions found in the project.

    Parameters
    ----------
    project_root:
        Root directory to search for ``*.agent.json`` files.

    Returns
    -------
    list of dict
        Each dict has at minimum ``name``, ``file``, and ``description`` keys.

    Examples
    --------
    >>> from ai_agencee import list_agents
    >>> agents = list_agents(project_root="/my/project")
    >>> for a in agents:
    ...     print(a["name"])
    """
    return _run_cli(["agent:list"], project_root=project_root)
