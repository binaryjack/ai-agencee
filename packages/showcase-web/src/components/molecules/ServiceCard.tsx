import { CheckItem } from '@/components/atoms/CheckItem'
import { Icon, type IconName } from '@ai-agencee/ui/icons'

export interface ServiceItem {
  icon:         IconName
  title:        string
  description:  string
  deliverables: string[]
}

interface Props {
  readonly service: ServiceItem
}

export function ServiceCard({ service }: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-node border border-neutral-700 bg-neutral-800 p-6">
      <div className="flex items-center gap-3">
        <Icon name={service.icon} theme="dark" size={24} />
        <h3 className="text-base font-bold text-neutral-100">{service.title}</h3>
      </div>
      <p className="text-xs leading-relaxed text-neutral-400">{service.description}</p>
      <ul className="mt-auto flex flex-col gap-1.5">
        {service.deliverables.map((d) => (
          <CheckItem key={d} label={d} />
        ))}
      </ul>
    </div>
  )
}
