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
<<<<<<< HEAD

  const describedBy = error
    ? `${id}-error`
    : hint
      ? `${id}-hint`
      : undefined;

  return (
    <div className="group">
      <label
        htmlFor={id}
        className="mb-2.5 block text-sm font-black tracking-[-0.01em] text-[#26342B]"
      >
        {label}
      </label>

      <div className="relative">
        {/* brillo interior sutil */}
        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />

        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`
            w-full
            rounded-[1.15rem]
            border
            bg-[#FFFDF8]
            px-4
            py-3.5
            text-sm
            font-semibold
            text-[#242B25]
            caret-[#9A5B3C]
            outline-none

            shadow-[0_8px_24px_rgba(91,58,41,0.06)]

            transition
            duration-300

            placeholder:font-medium
            placeholder:text-[#857C70]

            hover:border-[#6F8064]/45

            focus:bg-white
            focus:shadow-[0_12px_34px_rgba(47,75,59,0.11)]
            focus:ring-4
            focus:ring-[#2F4B3B]/10

            disabled:cursor-not-allowed
            disabled:bg-[#EFE9DE]
            disabled:text-[#8B8174]
            disabled:opacity-70

            ${
              error
                ? `
                  border-[#9A5B3C]/55
                  focus:border-[#9A5B3C]
                  focus:ring-[#9A5B3C]/10
                `
                : `
                  border-[#5B3A29]/20
                  focus:border-[#2F4B3B]/75
                `
            }

            ${className}
          `}
          {...props}
        />
      </div>

      {error ? (
        <span
          id={`${id}-error`}
          role="alert"
          className="mt-2 flex items-center gap-2 text-xs font-bold text-[#7B3F2D]"
        >
          <span
            aria-hidden="true"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#9A5B3C]/10 text-[0.65rem] font-black"
          >
            !
          </span>

          {error}
        </span>
      ) : hint ? (
        <span
          id={`${id}-hint`}
          className="mt-2 block text-xs font-medium leading-5 text-[#81796F]"
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
}
=======
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
>>>>>>> origin/main
