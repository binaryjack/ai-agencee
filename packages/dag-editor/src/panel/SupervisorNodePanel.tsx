import { Button } from '@ai-agencee/ui/atoms'
import type { SupervisorNodeData } from '@ai-agencee/ui/dag'
import { FormProvider, Input, Select } from '@ai-agencee/ui/formular-bridge'
import { createForm, DirectSubmissionStrategy, f } from '@pulsar-framework/formular.dev'
import { useMemo } from 'react'

const FAIL_BEHAVIOR_OPTIONS = [
  { value: 'halt', label: 'Halt (stop DAG)' },
  { value: 'warn', label: 'Warn (continue)' },
]

const supervisorSchema = f.object({
  label:         f.string().nonempty(),
  passThreshold: f.number().min(0).max(1).default(1),
  failBehavior:  f.enum(['halt', 'warn']).default('halt'),
})

interface SupervisorNodePanelProps {
  nodeId:   string
  data:     SupervisorNodeData
  onUpdate: (id: string, data: SupervisorNodeData) => void
}

export function SupervisorNodePanel({ nodeId, data, onUpdate }: SupervisorNodePanelProps) {
  const form = useMemo(
    () =>
      createForm({
        schema:        supervisorSchema,
        defaultValues: data,
        submissionStrategy: new DirectSubmissionStrategy(async (values) => {
          onUpdate(nodeId, { ...data, ...values } as SupervisorNodeData)
        }),
      }),
    [nodeId],
  )

  return (
    <FormProvider form={form as never}>
      <div className="flex flex-col gap-3 p-4">
        <Input  name="label"         label="Label" />
        <Input  name="passThreshold" label="Pass threshold (0–1)" type="number" />
        <Select name="failBehavior"  label="On fail" options={FAIL_BEHAVIOR_OPTIONS} />
      </div>
      <div className="flex gap-2 px-4 pt-2 border-t border-neutral-700">
        <Button size="sm" onClick={() => form.submit()}>Apply</Button>
        <Button size="sm" variant="ghost" onClick={() => form.reset()}>Reset</Button>
      </div>
    </FormProvider>
  )
}
