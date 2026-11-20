/**
 * Pantalla de preferencias y restricciones del turista — `/mi-cuenta/preferencias`.
 *
 * Disponible para cualquier usuario autenticado (ADMIN y TOURIST), igual que
 * el perfil. El formulario envía las categorías a `/api/preferences/` y las
 * restricciones duras a `/api/recomendaciones/consultas/`.
 */

import { Link } from "react-router-dom";
import { PrivateShell } from "../../cuenta/components/PrivateShell";
import { PreferenciasForm } from "../components/PreferenciasForm";

function Pista({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <li className="border-l-2 border-[#C6923B]/50 bg-[#F3EBDD]/45 px-4 py-3.5">
      <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#233128]">
        {titulo}
      </p>
      <p className="mt-1.5 text-xs leading-6 text-[#746D63]">{detalle}</p>
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

        <aside className="space-y-5 border border-[#5B3A29]/15 bg-[#FFFDF8] px-5 py-6 sm:px-7">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#9A5B3C]">
              02 / Notas al margen
            </p>

            <h2 className="mt-1.5 font-display text-2xl font-black tracking-[-0.02em] text-[#233128]">
              Cómo lo usamos
            </h2>
          </div>

          <p className="text-sm leading-7 text-[#514B43]">
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
            className="group flex items-center justify-between gap-3 bg-[#233128] px-5 py-4 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#FFFDF8] transition hover:bg-[#2F4B3B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#233128]"
          >
            Ver mis recomendaciones
            <span
              aria-hidden="true"
              className="font-display text-base transition-transform group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </aside>
      </div>
    </PrivateShell>
  );
}
