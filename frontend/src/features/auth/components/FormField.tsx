import { useId, type InputHTMLAttributes } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function FormField({
  label,
  error,
  hint,
  className = "",
  ...props
}: FormFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-200">
        {label}
      </span>

      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`w-full rounded-xl border bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:ring-2 ${
          error
            ? "border-rose-400/70 focus:border-rose-400 focus:ring-rose-400/20"
            : "border-white/10 focus:border-sky-400 focus:ring-sky-400/20"
        } ${className}`}
        {...props}
      />

      {error ? (
        <span id={`${id}-error`} className="mt-1.5 block text-xs text-rose-300">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="mt-1.5 block text-xs text-slate-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
