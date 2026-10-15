/**
 * Pantalla de preferencias y restricciones del turista — `/mi-cuenta/preferencias`.
 *
 * Disponible para cualquier usuario autenticado (ADMIN y TOURIST), igual que
 * el perfil. El formulario envía las categorías a `/api/preferences/` y las
 * restricciones duras a `/api/recomendaciones/consultas/`.
 */

import { PrivateShell } from "../../cuenta/components/PrivateShell";
import { PreferenciasForm } from "../components/PreferenciasForm";

function Pista({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <li className="rounded-2xl border border-[#5B3A29]/[0.08] bg-[#F3EBDD]/50 px-4 py-3.5">
      <p className="text-xs font-black text-[#233128]">{titulo}</p>
      <p className="mt-1 text-xs leading-6 text-[#746D63]">{detalle}</p>
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

        <aside className="space-y-4 rounded-[2rem] border border-[#5B3A29]/[0.08] bg-[#FFFDF8] px-6 py-7 shadow-[0_20px_60px_rgba(72,55,38,0.08)] sm:px-7">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-[#9A5B3C]" aria-hidden="true" />
            <h2 className="text-lg font-black tracking-tight text-[#233128]">
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
        </aside>
      </div>
    </PrivateShell>
  );
}
