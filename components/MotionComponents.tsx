'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import React from 'react'

export function StaggerContainer({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-50px" }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300 } } }}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedButton(props: HTMLMotionProps<"button">) {
  return <motion.button whileTap={{ scale: 0.95 }} {...props} />
}
