import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

type Variante = "primary" | "secondary" | "quiet" | "route";

const CLASE_BASE =
  "lp-button inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold";

const VARIANTES: Record<Variante, string> = {
  primary: "lp-button--primary",
  secondary: "lp-button--secondary",
  quiet: "lp-button--quiet",
  route: "lp-button--route",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variante?: Variante;
    children: ReactNode;
  }
>(function Button(
  { variante = "primary", className = "", children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`${CLASE_BASE} ${VARIANTES[variante]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

export function ButtonLink({
  variante = "primary",
  className = "",
  children,
  ...props
}: LinkProps & {
  variante?: Variante;
  children: ReactNode;
}) {
  return (
    <Link
      className={`${CLASE_BASE} ${VARIANTES[variante]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}
