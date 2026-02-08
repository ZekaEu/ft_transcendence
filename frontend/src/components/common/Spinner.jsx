import React from 'react'

export function Spinner({
  size = 'md',
  color = 'primary',
  className = '',
  ...props
}) {
  const sizeClass = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  }[size]

  const colorClass = {
    primary: 'border-primary-600 border-t-transparent',
    secondary: 'border-secondary-600 border-t-transparent',
    white: 'border-white border-t-transparent',
  }[color]

  return (
    <div
      className={`${sizeClass} ${colorClass} border-4 border-solid rounded-full animate-spin ${className}`}
      {...props}
    />
  )
}
