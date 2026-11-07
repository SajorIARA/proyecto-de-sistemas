/**
 * Control «ver / ocultar» para los campos de contraseña.
 *
 * Es un botón real (no un icono suelto) para que funcione con teclado y
 * lectores de pantalla. `aria-controls` lo asocia con el input y
 * `aria-pressed` anuncia el estado del interruptor.
 */

import { Icono } from "../../../components/site/Iconos";

export function ToggleContrasena({
  visible,
  controls,
  onToggle,
}: {
  visible: boolean;
  controls: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={visible}
      aria-controls={controls}
      aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      className="flex h-9 items-center gap-1 rounded-full px-2.5 text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#6F6558] transition hover:bg-[#2F4B3B]/10 hover:text-[#2F4B3B] focus-visible:ring-2 focus-visible:ring-[#2F4B3B]/30 focus-visible:outline-none"
    >
      <Icono
        nombre={visible ? "ojoTachado" : "ojo"}
        className="h-4 w-4"
      />

      <span aria-hidden="true">{visible ? "Ocultar" : "Ver"}</span>
    </button>
  );
}
