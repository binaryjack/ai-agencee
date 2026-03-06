'use client'

import { GradientText } from '@/components/atoms/GradientText'
import { SectionLabel } from '@/components/atoms/SectionLabel'
import { SectionWrapper } from '@/components/layout/SectionWrapper'
import { Button, Divider, Heading, Text } from '@ai-agencee/ui/atoms'
import type { IFormularLike } from '@ai-agencee/ui/formular-bridge'
import { CheckBox, FormProvider, Input, Select } from '@ai-agencee/ui/formular-bridge'
import { createForm, DirectSubmissionStrategy, f } from '@pulsar-framework/formular.dev'
import { useEffect, useState } from 'react'

type SubmitStatus = 'idle' | 'sending' | 'success' | 'error'

const TOPIC_OPTIONS = [
  { value: 'general',   label: 'General enquiry' },
  { value: 'bug',       label: 'Bug report' },
  { value: 'feature',   label: 'Feature request' },
  { value: 'other',     label: 'Other' },
]

const contactSchema = f.object({
  name:             f.string().nonempty('Name is required'),
  email:            f.string().email('Must be a valid email'),
  topic:            f.enum(['general', 'bug', 'feature', 'other']),
  message:          f.string().min(10, 'Message must be at least 10 characters'),
  subscribeUpdates: f.boolean().default(false),
})

export default function ContactPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [form, setForm]           = useState<IFormularLike | null>(null)
  const [status, setStatus]       = useState<SubmitStatus>('idle')
  const [errorMsg, setErrorMsg]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    createForm({
      schema: contactSchema,
      defaultValues: {
        name: '', email: '', topic: 'general', message: '', subscribeUpdates: false,
      },
      submissionStrategy: new DirectSubmissionStrategy(async (data: Record<string, unknown>) => {
        setStatus('sending')
        setErrorMsg(null)
        try {
          const res = await fetch('/api/contact', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(data),
          })
          const json = await res.json() as { success?: boolean; error?: string }
          if (!res.ok || !json.success) {
            throw new Error(json.error ?? 'Unexpected error')
          }
          setStatus('success')
        } catch (err) {
          setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
          setStatus('error')
        }
      }) as never,
    }).then((f) => {
      if (!cancelled) setForm(f as unknown as IFormularLike)
    })
    return () => { cancelled = true }
  }, [])

  if (!form) {
    return (
      <SectionWrapper width="narrow">
        <div className="flex flex-col gap-6">
          <Heading level={2}>Contact Form</Heading>
          <div className="text-sm text-neutral-400">Initialising form…</div>
        </div>
      </SectionWrapper>
    )
  }

  return (
    <SectionWrapper width="narrow">
      {/* Page header */}
      <div className="mb-10 flex flex-col gap-2">
        <SectionLabel>Get in touch</SectionLabel>
        <h1 className="text-3xl font-extrabold text-neutral-100 sm:text-4xl">
          <GradientText>Contact us</GradientText>
        </h1>
        <p className="max-w-lg text-sm leading-relaxed text-neutral-400">
          Questions, feedback, enterprise trial requests — we read everything and respond
          within one business day.
        </p>
      </div>

      <div className="flex flex-col gap-6 max-w-lg">
        {status === 'success' ? (
          <div className="rounded-node border border-green-700 bg-green-950/40 p-6 text-center flex flex-col gap-3">
            <p className="text-2xl">✅</p>
            <Heading level={2}>Message sent!</Heading>
            <Text variant="muted">
              Thanks for reaching out. You'll receive a confirmation email shortly and we'll
              reply within one business day.
            </Text>
            <Button variant="ghost" onClick={() => setStatus('idle')}>Send another message</Button>
          </div>
        ) : (
          <>
            <div>
              <Heading level={2}>Contact Form</Heading>
              <Text variant="muted">
                Demonstrates <code className="text-brand-400">FormProvider</code> +{' '}
                <code className="text-brand-400">Input / Select / CheckBox</code> from{' '}
                <code className="text-brand-400">@ai-agencee/ui/formular-bridge</code>.
              </Text>
            </div>

            {status === 'error' && errorMsg && (
              <div className="rounded-node border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                {errorMsg}
              </div>
            )}

            <FormProvider form={form}>
              <div className="flex flex-col gap-4 rounded-node border border-neutral-700 bg-neutral-800 p-6">
                <Input     name="name"             label="Full name"    placeholder="Jane Doe" />
                <Input     name="email"            label="Email"        placeholder="jane@example.com" type="email" />
                <Select    name="topic"            label="Topic"        options={TOPIC_OPTIONS} />
                <Input     name="message"          label="Message"      placeholder="Tell us something…" />
                <CheckBox  name="subscribeUpdates" label="Subscribe to project updates" />
                <Divider />
                <div className="flex gap-2">
                  <Button onClick={() => form.submit()} disabled={status === 'sending'}>
                    {status === 'sending' ? 'Sending…' : 'Send message'}
                  </Button>
                  <Button variant="ghost" onClick={() => form.reset()} disabled={status === 'sending'}>Reset</Button>
                </div>
              </div>
            </FormProvider>
          </>
        )}
      </div>
    </SectionWrapper>
  )
}
