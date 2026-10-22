import type { ReactNode } from 'react'

interface Props {
  title: string
  children?: ReactNode
  action?: ReactNode
}

export function EmptyState({ title, children, action }: Props) {
  return (
    <div className="state empty">
      <p className="empty__glyph" aria-hidden="true">
        &gt;_
      </p>
      <h2 className="empty__title">{title}</h2>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  )
}
