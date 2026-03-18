import { useCallback, useEffect, useRef, useState } from 'react'
import type { HostMessage, ModelInfo, WebviewMessage } from './message.types.js'

declare const acquireVsCodeApi: () => {
  postMessage: (msg: WebviewMessage) => void
}

const vscode = acquireVsCodeApi()

// ── Guided Workflow Engine ──────────────────────────────────────────────────

type WorkflowType = 'agent' | 'dag' | 'rule' | 'run' | 'plan'

interface GuidedStep {
  question: string
  placeholder: string
  field: string
  optional?: boolean
  defaultValue?: string
  preprocess?: (data: Record<string, string>) => Record<string, string>
}

interface GuidedFlow {
  type: WorkflowType
  label: string
  activationMsg: string
  steps: GuidedStep[]
  buildToolCall: (data: Record<string, string>) => { toolName: string; toolArgs: Record<string, unknown> }
}

const toKebab = (s: string): string =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)

const interpolate = (template: string, data: Record<string, string>): string =>
  template.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? '')

const FLOWS: Record<WorkflowType, GuidedFlow> = {
  agent: {
    type: 'agent',
    label: '+ Agent',
    activationMsg:
      '**Agent Creation Mode** — type **@cancel** to exit at any time.\n\n**Step 1 of 2:** What should this agent do? Describe its purpose in plain language.',
    steps: [
      {
        question: '**Step 1 of 2:** What should this agent do?',
        placeholder: 'e.g. Review PRs for security issues…',
        field: 'description',
      },
      {
        question:
          '**Step 2 of 2:** Suggested name: **{name}**\n\nType **confirm** to create it, or enter a different kebab-case name.',
        placeholder: 'confirm  or  my-agent-name',
        field: '_nameConfirm',
        preprocess: (d) => ({ ...d, name: toKebab(d.description ?? 'new-agent') }),
      },
    ],
    buildToolCall: (d) => ({
      toolName: 'create-agent',
      toolArgs: {
        name:
          d._nameConfirm && d._nameConfirm !== 'confirm'
            ? d._nameConfirm
            : (d.name ?? toKebab(d.description ?? 'new-agent')),
        description: d.description,
      },
    }),
  },

  dag: {
    type: 'dag',
    label: '+ DAG',
    activationMsg:
      '**DAG Creation Mode** — type **@cancel** to exit.\n\n**Step 1 of 2:** What workflow does this DAG orchestrate? Describe its goal.',
    steps: [
      {
        question: '**Step 1 of 2:** What workflow does this DAG orchestrate?',
        placeholder: 'e.g. Full-stack feature: BA → Architecture → Backend + Frontend → Testing',
        field: 'description',
      },
      {
        question:
          '**Step 2 of 2:** Suggested name: **{dagName}**\n\nType **confirm** to scaffold it with empty lanes (edit the file to add agents), or enter a different name.',
        placeholder: 'confirm  or  my-dag-name',
        field: '_nameConfirm',
        preprocess: (d) => ({ ...d, dagName: toKebab(d.description ?? 'new-dag') }),
      },
    ],
    buildToolCall: (d) => ({
      toolName: 'create-dag',
      toolArgs: {
        dagName:
          d._nameConfirm && d._nameConfirm !== 'confirm'
            ? d._nameConfirm
            : (d.dagName ?? toKebab(d.description ?? 'new-dag')),
        description: d.description,
        lanes: [],
      },
    }),
  },

  rule: {
    type: 'rule',
    label: '+ Rule',
    activationMsg:
      '**Rule Creation Mode** — type **@cancel** to exit.\n\n**Step 1 of 3:** What\'s the rule heading?\n\n_e.g. "No default exports"_',
    steps: [
      {
        question: "**Step 1 of 3:** What's the rule heading?",
        placeholder: 'e.g. No default exports',
        field: 'heading',
      },
      {
        question: '**Step 2 of 3:** Describe the rule body (markdown supported).',
        placeholder: 'Rule body…',
        field: 'body',
      },
      {
        question:
          '**Step 3 of 3:** Rule: **{heading}**\n\nType **confirm** to write it to `.ai/rules.md`.',
        placeholder: 'confirm',
        field: '_confirm',
      },
    ],
    buildToolCall: (d) => ({
      toolName: 'create-rule',
      toolArgs: { heading: d.heading, body: d.body },
    }),
  },

  run: {
    type: 'run',
    label: '▶ Run DAG',
    activationMsg:
      '**Run DAG Mode** — type **@cancel** to exit.\n\n**Step 1 of 1:** Enter the DAG file path, or press Enter / type **default** to use `agents/dag.json`.',
    steps: [
      {
        question: '**Step 1 of 1:** DAG file path (Enter or "default" = `agents/dag.json`):',
        placeholder: 'agents/dag.json',
        field: 'dagFile',
        optional: true,
        defaultValue: 'agents/dag.json',
      },
    ],
    buildToolCall: (d) => ({
      toolName: 'agent-dag',
      toolArgs: { dagFile: !d.dagFile || d.dagFile === 'default' ? 'agents/dag.json' : d.dagFile },
    }),
  },

  plan: {
    type: 'plan',
    label: '⚡ Plan',
    activationMsg:
      '**Plan Mode** — type **@cancel** to exit.\n\n**Step 1 of 1:** Describe the feature you want to plan. The BA agent will decompose it into a sprint.',
    steps: [
      {
        question: '**Step 1 of 1:** Describe the feature or change to plan:',
        placeholder: 'e.g. Add OAuth login with GitHub…',
        field: 'specification',
      },
    ],
    buildToolCall: (d) => ({
      toolName: 'cli-run',
      toolArgs: { command: `plan --spec "${d.specification}"` },
    }),
  },
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  guided?: WorkflowType
}

interface GuidedState {
  type: WorkflowType
  step: number
  data: Record<string, string>
}

// ── Component ──────────────────────────────────────────────────────────────────

export const ChatPanel = function () {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '**AI Agencee** ready.\n\nUse the buttons above to create Agents, DAGs and Rules — or chat freely.',
    },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>()
  const [mcpStatus, setMcpStatus] = useState<'connecting' | 'ready' | 'error' | 'stopped'>(
    'connecting',
  )
  const [mcpDetail, setMcpDetail] = useState<string | undefined>()
  const [guidedMode, setGuidedMode] = useState<GuidedState | null>(null)
  const streamBuffers = useRef<Map<string, string>>(new Map())
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    vscode.postMessage({ type: 'request-models' })

    const handler = (event: MessageEvent<HostMessage>) => {
      const msg = event.data
      if (msg.type === 'models-list') {
        setModels(msg.models)
        setSelectedModelId(msg.selectedId ?? msg.models[0]?.id)
      } else if (msg.type === 'mcp-status') {
        setMcpStatus(msg.status)
        setMcpDetail(msg.detail)
      } else if (msg.type === 'stream-token') {
        const buf = (streamBuffers.current.get(msg.requestId) ?? '') + msg.token
        streamBuffers.current.set(msg.requestId, buf)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.requestId ? { ...m, content: buf, streaming: !msg.done } : m,
          ),
        )
        if (msg.done) {
          streamBuffers.current.delete(msg.requestId)
          setBusy(false)
        }
      } else if (msg.type === 'tool-result' || msg.type === 'error') {
        const text = msg.type === 'tool-result' ? msg.result : `Error: ${msg.message}`
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.requestId ? { ...m, content: text, streaming: false } : m,
          ),
        )
        setBusy(false)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const activateFlow = useCallback(
    (type: WorkflowType) => {
      if (busy) return
      const flow = FLOWS[type]
      const introMsg: Message = {
        id: `guided-intro-${Date.now()}`,
        role: 'assistant',
        content: flow.activationMsg,
        guided: type,
      }
      setMessages((prev) => [...prev, introMsg])
      setGuidedMode({ type, step: 0, data: {} })
      setInput('')
      textareaRef.current?.focus()
    },
    [busy],
  )

  const exitGuidedMode = useCallback(
    (reason: 'cancel' | 'pause') => {
      setGuidedMode(null)
      const exitMsg: Message = {
        id: `guided-exit-${Date.now()}`,
        role: 'assistant',
        content:
          reason === 'pause'
            ? "Guided mode paused — you're back in free chat. Click a workflow button to start a new one."
            : 'Guided mode cancelled — back to free chat.',
      }
      setMessages((prev) => [...prev, exitMsg])
      setInput('')
    },
    [],
  )

  const send = useCallback(
    (rawText: string) => {
      const trimmed = rawText.trim()
      if (!trimmed || busy) return

      // ── Guided escape commands ─────────────────────────────────────────────
      if (guidedMode && /^@(cancel|exit)\b/i.test(trimmed)) {
        exitGuidedMode('cancel')
        return
      }
      if (guidedMode && /^@pause\b/i.test(trimmed)) {
        exitGuidedMode('pause')
        return
      }

      // ── Guided step handler ────────────────────────────────────────────────
      if (guidedMode) {
        const flow = FLOWS[guidedMode.type]
        const stepDef = flow.steps[guidedMode.step]
        const currentGuideType = guidedMode.type

        const userMsg: Message = {
          id: `u-${Date.now()}`,
          role: 'user',
          content: trimmed,
          guided: currentGuideType,
        }
        setMessages((prev) => [...prev, userMsg])
        setInput('')

        const answer =
          stepDef.optional && (!trimmed || trimmed.toLowerCase() === 'default')
            ? (stepDef.defaultValue ?? trimmed)
            : trimmed

        let newData: Record<string, string> = { ...guidedMode.data, [stepDef.field]: answer }
        const nextStepIndex = guidedMode.step + 1

        if (nextStepIndex >= flow.steps.length) {
          // ── Final step — fire tool call ──────────────────────────────────
          setGuidedMode(null)
          const requestId = `guided-${Date.now()}`
          setBusy(true)
          const resultMsg: Message = {
            id: requestId,
            role: 'assistant',
            content: '',
            streaming: true,
            guided: currentGuideType,
          }
          setMessages((prev) => [...prev, resultMsg])
          const { toolName, toolArgs } = flow.buildToolCall(newData)
          vscode.postMessage({ type: 'call-tool', toolName, toolArgs, requestId })
        } else {
          // ── Advance to next step ─────────────────────────────────────────
          const nextStep = flow.steps[nextStepIndex]
          if (nextStep.preprocess) {
            newData = nextStep.preprocess(newData)
          }
          const question = interpolate(nextStep.question, newData)
          setGuidedMode({ type: currentGuideType, step: nextStepIndex, data: newData })
          const questionMsg: Message = {
            id: `guided-q-${Date.now()}`,
            role: 'assistant',
            content: question,
            guided: currentGuideType,
          }
          setMessages((prev) => [...prev, questionMsg])
        }
        return
      }

      // ── Normal free-chat send ──────────────────────────────────────────────
      const requestId = `msg-${Date.now()}`
      const userMsg: Message = { id: `u-${requestId}`, role: 'user', content: trimmed }
      const assistantMsg: Message = { id: requestId, role: 'assistant', content: '', streaming: true }
      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setInput('')
      setBusy(true)
      vscode.postMessage({ type: 'send-message', text: trimmed, requestId })
    },
    [busy, guidedMode, exitGuidedMode],
  )

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const activeFlow = guidedMode ? FLOWS[guidedMode.type] : null
  const currentStepDef = guidedMode ? activeFlow?.steps[guidedMode.step] : undefined

  return (
    <div className={`chat-root${activeFlow ? ` chat-root--mode-${activeFlow.type}` : ''}`}>
      {/* Model selector */}
      {models.length > 0 && (
        <div className="model-bar">
          <span className="model-label">Model</span>
          <select
            className="model-select"
            value={selectedModelId ?? ''}
            onChange={(e) => {
              const id = e.target.value
              setSelectedModelId(id)
              vscode.postMessage({ type: 'select-model', modelId: id })
            }}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.multiplier != null ? ` (${m.multiplier}x)` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* MCP status banner */}
      {mcpStatus !== 'ready' && (
        <div className={`mcp-banner mcp-banner--${mcpStatus}`}>
          <span className="mcp-banner__icon">
            {mcpStatus === 'connecting' ? '⌛' : mcpStatus === 'error' ? '⚠️' : '⏹'}
          </span>
          <span className="mcp-banner__text">
            {mcpStatus === 'connecting' && 'MCP server connecting…'}
            {mcpStatus === 'error' && (mcpDetail ?? 'MCP server error')}
            {mcpStatus === 'stopped' && 'MCP server stopped'}
          </span>
          {(mcpStatus === 'error' || mcpStatus === 'stopped') && (
            <button
              className="mcp-banner__btn"
              onClick={() => vscode.postMessage({ type: 'restart-mcp' })}
            >
              Restart
            </button>
          )}
        </div>
      )}

      {/* Workflow action bar */}
      <div className="quick-bar">
        {(Object.keys(FLOWS) as WorkflowType[]).map((type) => {
          const flow = FLOWS[type]
          const isActive = guidedMode?.type === type
          return (
            <button
              key={type}
              className={`quick-btn quick-btn--${type}${isActive ? ' quick-btn--active' : ''}`}
              onClick={() => !isActive && activateFlow(type)}
              title={isActive ? 'Currently active — type @cancel to exit' : `Start ${flow.label} wizard`}
            >
              {flow.label}
            </button>
          )
        })}
      </div>

      {/* Active flow badge */}
      {activeFlow && guidedMode && (
        <div className={`mode-badge mode-badge--${activeFlow.type}`}>
          <span className="mode-badge__label">
            {activeFlow.type.charAt(0).toUpperCase() + activeFlow.type.slice(1)} Mode
            {` · Step ${guidedMode.step + 1} of ${activeFlow.steps.length}`}
          </span>
          <span className="mode-badge__hint">@cancel · @pause</span>
        </div>
      )}

      {/* Message list */}
      <div className="message-list">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`message message--${m.role}${m.guided ? ` message--guided message--guided-${m.guided}` : ''}`}
          >
            <div className="message__bubble">
              <Markdown text={m.content} />
              {m.streaming && <span className="cursor" />}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className={`input-bar${activeFlow ? ` input-bar--guided input-bar--${activeFlow.type}` : ''}`}>
        <textarea
          ref={textareaRef}
          className="input-textarea"
          rows={2}
          placeholder={
            busy
              ? 'Waiting…'
              : currentStepDef
              ? currentStepDef.placeholder
              : 'Describe what to build… (Enter to send)'
          }
          value={input}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          className="send-btn"
          disabled={busy || !input.trim()}
          onClick={() => send(input)}
        >
          ▶
        </button>
      </div>
    </div>
  )
}

// ── Minimal markdown renderer ──────────────────────────────────────────────────

const Markdown = function ({ text }: { text: string }) {
  const html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />')
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

