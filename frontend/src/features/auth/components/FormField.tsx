import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  /** Control a la derecha del campo (p. ej. mostrar/ocultar contraseña). */
  trailing?: ReactNode;
  /** Contenido bajo el campo: medidor de fuerza, checklist, etc. */
  meta?: ReactNode;
}

export function FormField({
  label,
  error,
  hint,
  trailing,
  meta,
  id: idProp,
  required,
  className = "",
  ...props
}: FormFieldProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;

  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint && !error ? `${id}-hint` : undefined;

  const describedBy =
    [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="group">
      <label
        htmlFor={id}
        className={[
          "mb-2.5 block text-sm font-black tracking-[-0.01em] text-[var(--color-text)]",
          required
            ? "after:ml-1 after:text-[var(--color-brand)] after:content-['*']"
            : "",
        ].join(" ")}
      >
        {label}
      </label>

      <div className="relative">
        {/* brillo interior sutil */}
        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />

        <input
          id={id}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`
            w-full
            rounded-[1.15rem]
            border
            bg-[var(--color-surface)]
            px-4
            py-3.5
            ${trailing ? "pr-[6.2rem]" : ""}
            text-sm
            font-semibold
            text-[var(--color-text)]
            caret-[#9A5B3C]
            outline-none

            shadow-[0_8px_24px_rgba(91,58,41,0.06)]

            transition
            duration-300

            placeholder:font-medium
            placeholder:text-[var(--color-text-muted)]

            hover:border-[var(--color-border)]

            focus:bg-[var(--color-surface)]
            focus:shadow-[0_12px_34px_rgba(47,75,59,0.11)]
            focus:ring-4
            focus:ring-[var(--color-border-strong)]

            disabled:cursor-not-allowed
            disabled:bg-[var(--color-surface-muted)]
            disabled:text-[var(--color-text-muted)]
            disabled:opacity-70

            ${
              error
                ? `
                  border-[var(--color-brand)]
                  focus:border-[var(--color-brand)]
                  focus:ring-[var(--color-brand)]
                `
                : `
                  border-[var(--color-border)]
                  focus:border-[var(--color-border-strong)]
                `
            }

            ${className}
          `}
          {...props}
        />

        {trailing && (
          <div className="absolute inset-y-0 right-2 flex items-center">
            {trailing}
          </div>
        )}
      </div>

      {meta && <div className="mt-2.5">{meta}</div>}

      {error ? (
        <span
          id={`${id}-error`}
          role="alert"
          className="mt-2 flex items-center gap-2 text-xs font-bold text-[var(--color-brand)]"
        >
          <span
            aria-hidden="true"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-action)] text-[0.65rem] font-black"
          >
            !
          </span>

          {error}
        </span>
      ) : hint ? (
        <span
          id={`${id}-hint`}
          className="mt-2 block text-xs font-medium leading-5 text-[var(--color-text-muted)]"
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
}
