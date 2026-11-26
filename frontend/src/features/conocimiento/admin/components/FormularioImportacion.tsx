/**
 * Buscador de fuentes abiertas.
 *
 * Valida en cliente solo lo que el serializer del backend también valida;
 * la fuente de verdad es Django. El envío pasa por `useCrearImportacion`
 * (backend, `IsAdmin`), nunca por Overpass/Wikidata/Google directamente.
 */

import { useState, type FormEvent } from "react";

import { Button } from "../../../../design-system/components/Button";
import {
  CampoTexto,
  claseInput,
} from "../../../turismo/admin/components/CampoTexto";
import {
  CIUDADES_IMPORTACION,
  FUENTES_ABIERTAS,
  LIMITE_IMPORTACION,
  type FuenteAbierta,
} from "../../../../config/conocimiento";
import type { CrearImportacionInput } from "../../../../types/conocimiento";
import type { ImportacionesAdminApiError } from "../api/importacionesAdminApi";

interface Props {
  crear: (payload: CrearImportacionInput) => Promise<unknown>;
  pendiente: boolean;
  error: string | null;
  apiError: ImportacionesAdminApiError | null;
}

function mensajes(
  error: ImportacionesAdminApiError | null,
  campo: "consulta" | "ciudad" | "fuentes" | "limite",
): string[] {
  return error?.mensajesDe(campo) ?? [];
}

export function FormularioImportacion({
  crear,
  pendiente,
  error,
  apiError,
}: Props) {
  const [consulta, setConsulta] = useState("");
  const [ciudad, setCiudad] = useState<string>(CIUDADES_IMPORTACION[0]);
  const [fuentes, setFuentes] = useState<FuenteAbierta[]>(
    FUENTES_ABIERTAS.map((fuente) => fuente.id),
  );
  const [limite, setLimite] = useState(String(LIMITE_IMPORTACION.defecto));

  const limiteNumero = Number(limite);
  const erroresConsulta = mensajes(apiError, "consulta");
  const erroresLimite = mensajes(apiError, "limite");
  const consultaInvalida = consulta.trim().length < 3;
  const limiteInvalido =
    !Number.isInteger(limiteNumero) ||
    limiteNumero < LIMITE_IMPORTACION.min ||
    limiteNumero > LIMITE_IMPORTACION.max;

  function alternarFuente(id: FuenteAbierta) {
    setFuentes((actuales) =>
      actuales.includes(id)
        ? actuales.filter((fuente) => fuente !== id)
        : [...actuales, id],
    );
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (
      pendiente ||
      consultaInvalida ||
      limiteInvalido ||
      fuentes.length === 0
    ) {
      return;
    }
    await crear({
      consulta: consulta.trim(),
      ciudad,
      fuentes,
      limite: limiteNumero,
    });
  }

  const id = "importacion-consulta";

  return (
    <form onSubmit={enviar} noValidate className="space-y-5">
      <CampoTexto
        id={id}
        etiqueta="¿Qué lugares buscamos?"
        pista="Ejemplo: restaurantes en La Paz, museos de La Paz. Sin Google Maps."
        error={erroresConsulta}
        obligatorio
      >
        <input
          id={id}
          name="consulta"
          value={consulta}
          onChange={(evento) => setConsulta(evento.target.value)}
          placeholder="museos de La Paz"
          maxLength={120}
          className={claseInput(erroresConsulta.length > 0)}
          aria-invalid={consultaInvalida}
        />
      </CampoTexto>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="importacion-ciudad"
            className="block text-xs font-black text-[var(--color-text)]"
          >
            Ciudad
          </label>
          <select
            id="importacion-ciudad"
            name="ciudad"
            value={ciudad}
            onChange={(evento) => setCiudad(evento.target.value)}
            className={`${claseInput(false)} mt-2.5`}
          >
            {CIUDADES_IMPORTACION.map((nombre) => (
              <option key={nombre} value={nombre}>
                {nombre}
              </option>
            ))}
          </select>
        </div>

        <CampoTexto
          id="importacion-limite"
          etiqueta="Límite de resultados"
          error={erroresLimite}
        >
          <input
            id="importacion-limite"
            name="limite"
            type="number"
            min={LIMITE_IMPORTACION.min}
            max={LIMITE_IMPORTACION.max}
            value={limite}
            onChange={(evento) => setLimite(evento.target.value)}
            className={claseInput(erroresLimite.length > 0 || limiteInvalido)}
            aria-invalid={limiteInvalido}
          />
        </CampoTexto>
      </div>

      <fieldset>
        <legend className="text-xs font-black text-[var(--color-text)]">
          Fuentes abiertas
        </legend>
        <div className="mt-2.5 flex flex-wrap gap-4">
          {FUENTES_ABIERTAS.map((fuente) => (
            <label
              key={fuente.id}
              htmlFor={`fuente-${fuente.id}`}
              className="flex items-center gap-2 text-sm text-[var(--color-text)]"
            >
              <input
                id={`fuente-${fuente.id}`}
                type="checkbox"
                checked={fuentes.includes(fuente.id)}
                onChange={() => alternarFuente(fuente.id)}
                className="h-4 w-4 accent-[var(--color-brand)]"
              />
              {fuente.etiqueta}
            </label>
          ))}
        </div>
        {mensajes(apiError, "fuentes").length > 0 && (
          <ul className="mt-2 space-y-1 text-xs font-semibold text-[var(--color-danger)]">
            {mensajes(apiError, "fuentes").map((mensaje) => (
              <li key={mensaje}>{mensaje}</li>
            ))}
          </ul>
        )}
      </fieldset>

      {fuentes.length === 0 && (
        <p className="text-xs font-semibold text-[var(--color-danger)]">
          Elegí al menos una fuente.
        </p>
      )}
      {error && (
        <p className="text-sm font-semibold text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      )}

      {pendiente && (
        <p className="text-xs text-[var(--color-text-muted)]" role="status">
          Procesando en segundo plano: puede tardar alrededor de un minuto.
          Podés cerrar esta pantalla; el historial se actualiza solo y mostrará
          el error real si las fuentes no responden.
        </p>
      )}

      <Button type="submit" disabled={pendiente || fuentes.length === 0}>
        {pendiente ? "Encolando…" : "Buscar candidatos"}
      </Button>
    </form>
  );
}
