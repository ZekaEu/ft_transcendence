import React from 'react'

export function Card({
  children,
  className = '',
  hover = false,
  padding = 'md',
  ...props
}) {
  const paddingClass = {
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
  }[padding]

  return (
    <div
      className={`${hover ? 'card-hover' : 'card'} ${paddingClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
