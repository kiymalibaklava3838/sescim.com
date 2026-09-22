import React from 'react'

export function StaggerContainer({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

export function StaggerItem({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`transition-all duration-300 ${className || ''}`}>
      {children}
    </div>
  )
}

export function AnimatedButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`active:scale-95 transition-transform duration-150 ${className || ''}`} {...props}>
      {children}
    </button>
  )
}
