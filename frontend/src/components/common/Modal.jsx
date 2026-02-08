import React from 'react'

export function Modal({
  isOpen,
  title,
  children,
  onClose,
  size = 'md',
  ...props
}) {
  if (!isOpen) return null

  const sizeClass = {
    sm: 'w-96',
    md: 'w-full max-w-md',
    lg: 'w-full max-w-2xl',
  }[size]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        {...props}
      />

      {/* Modal */}
      <div className={`relative bg-white rounded-lg shadow-lg z-10 ${sizeClass}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
