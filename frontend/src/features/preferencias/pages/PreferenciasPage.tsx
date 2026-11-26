/**
 * Pantalla de preferencias y restricciones del turista — `/mi-cuenta/preferencias`.
 *
 * Disponible para cualquier usuario autenticado (ADMIN y TOURIST), igual que
 * el perfil. El formulario envía las categorías a `/api/preferences/` y las
 * restricciones duras a `/api/recomendaciones/consultas/`.
 */

import { Link } from "react-router-dom";
import { Icono } from "../../../components/site/Iconos";
import { PrivateShell } from "../../cuenta/components/PrivateShell";
import { PreferenciasForm } from "../components/PreferenciasForm";

function Pista({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <li className="border-l-2 border-[var(--color-route)] bg-[var(--color-canvas)] px-4 py-3.5">
      <p className="text-sm font-black">{titulo}</p>
      <p className="mt-1 text-xs leading-6 text-[var(--color-text-muted)]">{detalle}</p>
    </li>
  );
}

export function PreferenciasPage() {
  return (
    <PrivateShell
      eyebrow="Perfil de viaje"
      titulo="Preferencias y restricciones"
      descripcion="Cuéntanos qué te interesa y cuáles son tus límites de tiempo y presupuesto. Cada vez que pidas recomendaciones, partiremos de este perfil."
    >
      <div className="grid gap-6 lg:grid-cols-[1.55fr_0.85fr] lg:items-start">
        <PreferenciasForm />

        <aside className="lp-panel space-y-4 px-6 py-7 sm:px-7">
          <div className="flex items-center gap-3">
            <Icono nombre="ajustes" className="h-5 w-5 text-[var(--color-brand)]" />
            <h2 className="text-lg font-black">
              Cómo lo usamos
            </h2>
          </div>

          <p className="text-sm leading-7 text-[var(--color-text-muted)]">
            Tu borrador se guarda temporalmente en este navegador mientras
            completas el formulario. Nada se envía hasta que pulsas
            «Guardar preferencias».
          </p>

          <ul className="space-y-3">
            <Pista
              titulo="Categorías temáticas"
              detalle="Se guardan como tus intereses en el perfil y ordenan las recomendaciones."
            />
            <Pista
              titulo="Presupuesto tope"
              detalle="En bolivianos. Filtra destinos y actividades que superen lo que querés gastar."
            />
            <Pista
              titulo="Duración de la visita"
              detalle="Se almacena en horas, aunque la definas en días, para calcular recorridos posibles."
            />
            <Pista
              titulo="Punto de partida"
              detalle="Opcional. Debe estar dentro del área de La Paz; habilita el cálculo de distancias."
            />
          </ul>

          <Link
            to="/mi-cuenta/recomendaciones"
            className="lp-button lp-button--primary group flex min-h-12 items-center justify-between gap-3 px-5 py-3 text-sm font-black"
          >
            Ver mis recomendaciones
            <span
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </aside>
      </div>
    </PrivateShell>
  );
}
