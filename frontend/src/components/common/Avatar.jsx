import React from 'react'

export function Avatar({
  src,
  alt = 'User avatar',
  size = 'md',
  online = false,
  className = '',
  ...props
}) {
  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  }[size]

  return (
    <div className={`relative ${className}`} {...props}>
      <img
        src={src}
        alt={alt}
        className={`${sizeClass} rounded-full object-cover border-2 border-gray-200`}
      />
      {online && (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
      )}
    </div>
  )
}
