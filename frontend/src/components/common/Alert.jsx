import React from 'react'

export function Alert({
  type = 'info',
  title,
  message,
  onClose,
  className = '',
  ...props
}) {
  const typeClass = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  }[type]

  const iconClass = {
    info: 'ℹ️',
    success: '✓',
    warning: '⚠️',
    error: '✕',
  }[type]

  return (
    <div
      className={`border-l-4 p-4 rounded ${typeClass} ${className}`}
      {...props}
    >
      <div className="flex items-start">
        <span className="mr-3 text-lg">{iconClass}</span>
        <div className="flex-1">
          {title && <h4 className="font-semibold">{title}</h4>}
          {message && <p className="text-sm">{message}</p>}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-lg leading-none hover:opacity-75"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
