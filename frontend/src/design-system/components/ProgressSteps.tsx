interface Paso {
  etiqueta: string;
  descripcion?: string;
}

export function ProgressSteps({
  pasos,
  actual,
}: {
  pasos: Paso[];
  actual: number;
}) {
  return (
    <nav aria-label="Progreso de planificación">
      <ol className="lp-steps">
        {pasos.map((paso, indice) => {
          const numero = indice + 1;
          const activo = numero === actual;
          const completado = numero < actual;
          return (
            <li
              key={paso.etiqueta}
              className="lp-step"
              aria-current={activo ? "step" : undefined}
            >
              <span
                className={[
                  "lp-step__number",
                  activo ? "is-active" : "",
                  completado ? "is-complete" : "",
                ].join(" ")}
                aria-hidden="true"
              >
                {completado ? "✓" : numero}
              </span>
              <span className="min-w-0">
                <span className="lp-step__label">{paso.etiqueta}</span>
                {paso.descripcion && (
                  <span className="lp-step__description">{paso.descripcion}</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
