import React from 'react'

export function Avatar({
  src,
  alt = 'User avatar',
  size = 'md',
  online = false,
  className = '',
  ...props
}) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-32 h-32',
  }

  const selectedSize = sizeClasses[size] || sizeClasses.md

  return (
    <div className={`relative inline-block ${className}`} {...props}>
      <div className={`${selectedSize} rounded-full border-2 border-white dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-700 shadow-sm`}>
        {src ? (
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <span className="material-icons-round">person</span>
          </div>
        )}
      </div>
      {online && (
        <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full" />
      )}
    </div>
  )
}
