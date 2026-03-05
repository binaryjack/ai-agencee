import type { HTMLAttributes, ReactNode } from 'react'

type Level = 1 | 2 | 3 | 4 | 5 | 6

const sizeClass: Record<Level, string> = {
  1: 'text-4xl font-bold tracking-tight',
  2: 'text-3xl font-bold',
  3: 'text-2xl font-semibold',
  4: 'text-xl  font-semibold',
  5: 'text-lg  font-medium',
  6: 'text-base font-medium',
}

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?:    Level
  children:  ReactNode
}

export function Heading({ level = 2, children, className = '', ...rest }: HeadingProps) {
  const Tag = `h${level}` as const
  return (
    <Tag
      {...rest}
      className={[
        sizeClass[level],
        'text-neutral-900 dark:text-neutral-50',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Tag>
  )
}
