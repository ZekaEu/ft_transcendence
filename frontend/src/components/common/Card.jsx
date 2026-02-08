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
      className={`bg-white rounded-lg shadow-md ${paddingClass} ${hover ? 'hover:shadow-lg transition-shadow' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
