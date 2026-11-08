import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

export function Button({ className, variant = 'solid', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'solid' | 'outline' | 'ghost' }) {
  return (
    <button
      className={twMerge(
        'min-h-10 px-4 text-xs font-bold tracking-[.14em] uppercase transition disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'solid' && 'bg-clay text-white hover:bg-[#832a23]',
        variant === 'outline' && 'border border-ink/20 hover:border-ink hover:bg-white',
        variant === 'ghost' && 'text-ink/60 hover:text-clay',
        className,
      )}
      {...props}
    />
  )
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block text-[10px] font-bold tracking-[.16em] text-ink/55">
      {label}
      <div className={twMerge('mt-2', error && '[&_input]:border-clay [&_textarea]:border-clay [&_select]:border-clay')}>{children}</div>
      {error ? <p className="mt-1 text-xs font-medium normal-case tracking-normal text-clay">{error}</p> : hint ? <p className="mt-1 text-xs font-normal normal-case tracking-normal text-ink/40">{hint}</p> : null}
    </label>
  )
}

const control = 'min-h-11 w-full border border-ink/20 bg-white px-3 text-sm font-normal tracking-normal text-ink'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={twMerge(control, props.className)} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={twMerge(control, 'py-3', props.className)} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={twMerge(control, props.className)} />
}

export function Notice({ children }: { children: ReactNode }) {
  return <p className="border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay">{children}</p>
}

export function PageHeader({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[10px] font-bold tracking-[.2em] text-clay">{kicker}</p>
        <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">{title}</h1>
      </div>
      {children}
    </div>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={twMerge('bg-white p-5', className)}>{children}</div>
}
