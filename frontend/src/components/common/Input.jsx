import React from 'react'

export function Input({
  label,
  error,
  placeholder,
  type = 'text',
  required = false,
  disabled = false,
  value,
  onChange,
  onBlur,
  className = '',
  ...props
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={`input-base ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
        {...props}
      />
      {error && <span className="text-red-500 text-sm mt-1 block">{error}</span>}
    </div>
  )
}
