'use client'

import { GradientText } from '@/components/atoms/GradientText'
import { SectionLabel } from '@/components/atoms/SectionLabel'
import { SectionWrapper } from '@/components/layout/SectionWrapper'

// ─── LinkedIn / reach-out page ────────────────────────────────────────────────
// NOTE: The contact form is temporarily hidden while the mail API is being wired.
//       All form code is preserved below in a block comment — do NOT delete it.
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_ITEMS = [
  {
    icon:  '🧪',
    title: 'Testing phase',
    body:  'ai-agencee is currently in active testing. APIs, schemas and CLI commands may change before the stable release.',
  },
  {
    icon:  '🤝',
    title: 'Collaborate with me',
    body:  "Looking for early adopters, contributors, and technical partners. If you build AI workflows or enterprise tooling, let's talk.",
  },
  {
    icon:  '⭐',
    title: 'Show your interest',
    body:  'A GitHub star or a LinkedIn connection tells me this matters. It directly influences how fast features ship.',
  },
  {
    icon:  '💙',
    title: 'Support the work',
    body:  'This project is solo-built and MIT-licensed. Sponsorship, contract work, or simply spreading the word all help keep it alive.',
  },
  {
    icon:  '🆓',
    title: 'Free to use — CLI & local',
    body:  'The full CLI engine runs locally with zero API key required. Clone, install, and run `pnpm demo` right now — no account, no credit card.',
  },
]

export default function ContactPage() {
  return (
    <SectionWrapper width="narrow">
      {/* Page header */}
      <div className="mb-10 flex flex-col gap-2">
        <SectionLabel>Get in touch</SectionLabel>
        <h1 className="text-3xl font-extrabold text-neutral-100 sm:text-4xl">
          <GradientText>Let&apos;s connect</GradientText>
        </h1>
        <p className="max-w-lg text-sm leading-relaxed text-neutral-400">
          The contact form is temporarily unavailable while the mail API is being finalised.
          In the meantime, reach out directly on LinkedIn — I read every message.
        </p>
      </div>

      {/* Status cards */}
      <div className="mb-10 flex flex-col gap-4">
        {STATUS_ITEMS.map((item) => (
          <div
            key={item.title}
            className="flex gap-4 rounded-node border border-neutral-700 bg-neutral-800/50 px-5 py-4"
          >
            <span className="mt-0.5 text-xl leading-none" aria-hidden>{item.icon}</span>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-neutral-100">{item.title}</p>
              <p className="text-xs leading-relaxed text-neutral-400">{item.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* LinkedIn CTA */}
      <div className="flex flex-col gap-4 rounded-node border border-brand-700/50 bg-brand-900/20 px-6 py-6">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-neutral-100">Ready to reach out?</p>
          <p className="text-xs leading-relaxed text-neutral-400">
            Connect or send a message on LinkedIn. Mention ai-agencee so I can prioritise your request.
          </p>
        </div>
        <a
          href="https://www.linkedin.com/in/tadeopiana/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2.5 rounded-node bg-[#0A66C2] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90"
        >
          {/* LinkedIn logo */}
          <svg aria-hidden="true" width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          Connect on LinkedIn
        </a>

        <a
          href="https://github.com/binaryjack/ai-agencee"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-neutral-400 transition-colors hover:text-neutral-200"
        >
          ↗ Star the project on GitHub
        </a>
      </div>
    </SectionWrapper>
  )
}

/*
 * ─── CONTACT FORM — TEMPORARILY HIDDEN ───────────────────────────────────────
 * Keep this code intact. Re-enable once /api/contact is wired and tested.
 * To restore: remove this block comment, delete the component above, and
 * restore the imports below.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * import { Button, Divider, Heading, Text } from '@ai-agencee/ui/atoms'
 * import type { FormBridge, IFormularLike } from '@ai-agencee/ui/formular-bridge'
 * import { CheckBox, FormProvider, Input, Select, TextArea } from '@ai-agencee/ui/formular-bridge'
 * import { Icon } from '@ai-agencee/ui/icons'
 * import { createForm, f } from '@pulsar-framework/formular.dev'
 * import { useCallback, useEffect, useRef, useState } from 'react'
 *
 * type SagaStep = 'idle' | 'sending' | 'success' | 'error'
 * interface SagaState { step: SagaStep; errorMsg: string | null }
 *
 * const TOPIC_OPTIONS = [
 *   { value: 'general', label: 'General enquiry' },
 *   { value: 'bug',     label: 'Bug report' },
 *   { value: 'feature', label: 'Feature request' },
 *   { value: 'other',   label: 'Other' },
 * ]
 *
 * const contactSchema = f.object({
 *   name:             f.string().nonempty('Name is required'),
 *   email:            f.string().email('Must be a valid email').nonempty('Email is required'),
 *   topic:            f.enum(['general', 'bug', 'feature', 'other']),
 *   message:          f.string().min(10, 'Message must be at least 10 characters'),
 *   subscribeUpdates: f.boolean().default(false),
 * })
 *
 * function useContactSaga(bridgeRef: React.RefObject<FormBridge | null>) {
 *   const [state, setState] = useState<SagaState>({ step: 'idle', errorMsg: null })
 *
 *   const run = useCallback(async (data: Record<string, unknown>) => {
 *     setState({ step: 'sending', errorMsg: null })
 *     try {
 *       const res    = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
 *       const isJson = res.headers.get('content-type')?.includes('application/json') ?? false
 *       const json   = isJson ? (await res.json() as { success?: boolean; error?: string }) : { success: false, error: `Server error (${res.status})` }
 *       if (!res.ok || !json.success) throw new Error(json.error ?? `Server error (${res.status})`)
 *       setState({ step: 'success', errorMsg: null })
 *     } catch (err) {
 *       setState({ step: 'error', errorMsg: err instanceof Error ? err.message : 'Something went wrong.' })
 *     }
 *   }, [])
 *
 *   const reset = useCallback(() => {
 *     setState({ step: 'idle', errorMsg: null })
 *     bridgeRef.current?.reset()
 *   }, [bridgeRef])
 *
 *   return { state, run, reset }
 * }
 *
 * export default function ContactPage() {
 *   const [form, setForm] = useState<IFormularLike | null>(null)
 *   const bridgeRef = useRef<FormBridge | null>(null)
 *   const { state, run, reset } = useContactSaga(bridgeRef)
 *   const isSending = state.step === 'sending'
 *
 *   useEffect(() => {
 *     let cancelled = false
 *     createForm({
 *       schema: contactSchema,
 *       defaultValues: { name: '', email: '', topic: 'general', message: '', subscribeUpdates: false },
 *     }).then((f) => { if (!cancelled) setForm(f as unknown as IFormularLike) })
 *     return () => { cancelled = true }
 *   // eslint-disable-next-line react-hooks/exhaustive-deps
 *   }, [])
 *
 *   if (!form) {
 *     return (
 *       <SectionWrapper width="narrow">
 *         <div className="flex flex-col gap-6">
 *           <Heading level={2}>Contact Form</Heading>
 *           <div className="text-sm text-neutral-400">Initialising form…</div>
 *         </div>
 *       </SectionWrapper>
 *     )
 *   }
 *
 *   return (
 *     <SectionWrapper width="narrow">
 *       <div className="mb-10 flex flex-col gap-2">
 *         <SectionLabel>Get in touch</SectionLabel>
 *         <h1 className="text-3xl font-extrabold text-neutral-100 sm:text-4xl">
 *           <GradientText>Contact us</GradientText>
 *         </h1>
 *         <p className="max-w-lg text-sm leading-relaxed text-neutral-400">
 *           Questions, feedback, enterprise trial requests — we read everything and respond within one business day.
 *         </p>
 *       </div>
 *       <div className="flex flex-col gap-6 max-w-lg">
 *         {state.step === 'success' ? (
 *           <div className="rounded-node border border-green-700 bg-green-950/40 p-6 text-center flex flex-col gap-3">
 *             <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-900/60" aria-hidden>
 *               <Icon name="check" theme="auto" size={28} />
 *             </span>
 *             <Heading level={2}>Message sent!</Heading>
 *             <Text variant="muted">Thanks for reaching out. You will receive a confirmation email shortly and we will reply within one business day.</Text>
 *             <Button variant="ghost" onClick={reset}>Send another message</Button>
 *           </div>
 *         ) : (
 *           <>
 *             {state.step === 'error' && state.errorMsg && (
 *               <div role="alert" className="rounded-node border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">{state.errorMsg}</div>
 *             )}
 *             <FormProvider form={form} schema={contactSchema} onSubmit={run} onBridgeReady={(b) => { bridgeRef.current = b }}>
 *               <div className="relative">
 *                 {isSending && (
 *                   <div aria-live="polite" aria-label="Sending your message…" className="absolute inset-0 z-10 flex items-center justify-center rounded-node bg-neutral-900/60 backdrop-blur-sm">
 *                     <span className="h-8 w-8 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
 *                   </div>
 *                 )}
 *                 <div className="flex flex-col gap-4 rounded-node border border-neutral-700 bg-neutral-800 p-6">
 *                   <Input    name="name"             label="Full name"    placeholder="Jane Doe"           disabled={isSending} />
 *                   <Input    name="email"            label="Email"        placeholder="jane@example.com"   type="email" disabled={isSending} />
 *                   <Select   name="topic"            label="Topic"        options={TOPIC_OPTIONS}           disabled={isSending} />
 *                   <TextArea name="message"          label="Message"      placeholder="Tell us something…" rows={5} disabled={isSending} />
 *                   <CheckBox name="subscribeUpdates" label="Subscribe to project updates"                  disabled={isSending} />
 *                   <Divider />
 *                   <div className="flex gap-2">
 *                     <Button onClick={() => void bridgeRef.current?.submit()} loading={isSending} disabled={isSending}>
 *                       {isSending ? 'Sending…' : 'Send message'}
 *                     </Button>
 *                     <Button variant="ghost" onClick={reset} disabled={isSending}>Reset</Button>
 *                   </div>
 *                 </div>
 *               </div>
 *             </FormProvider>
 *           </>
 *         )}
 *       </div>
 *     </SectionWrapper>
 *   )
 * }
 */
