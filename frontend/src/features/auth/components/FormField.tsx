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
          "mb-2 block font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-[#5C574E]",
          required
            ? "after:ml-1 after:text-[#9A5B3C] after:content-['*']"
            : "",
        ].join(" ")}
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={[
            "w-full rounded-none border bg-[#FFFDF8] px-3.5 py-3 text-[0.95rem] font-medium text-[#242B25] caret-[#9A5B3C] outline-none transition",
            trailing ? "pr-[5.5rem]" : "",
            "placeholder:font-normal placeholder:text-[#968C7E]",
            "hover:border-[#2F4B3B]/55",
            "focus:border-[#2F4B3B] focus:ring-1 focus:ring-[#2F4B3B]/25",
            "disabled:cursor-not-allowed disabled:bg-[#EFE9DE] disabled:text-[#8B8174]",
            error
              ? "border-[#9A5B3C]/60 focus:border-[#9A5B3C] focus:ring-[#9A5B3C]/20"
              : "border-[#5B3A29]/30",
            className,
          ].join(" ")}
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
          className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold leading-5 text-[#7B3F2D]"
        >
          <span aria-hidden="true" className="font-black">
            !
          </span>

          {error}
        </span>
      ) : hint ? (
        <span
          id={`${id}-hint`}
          className="mt-1.5 block text-[11px] leading-5 text-[#81796F]"
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
}
