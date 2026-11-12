/**
 * Retrasa la propagación de un valor hasta que deja de cambiar durante
 * `retrasoMs`. Pensado para buscadores: cada pulsación reinicia el temporizador,
 * de modo que el valor "diferido" solo cambia cuando el usuario hace una pausa.
 *
 * El valor inicial es el mismo que recibe, así que no hay un cambio artificial
 * en el primer render (y, por tanto, ninguna petición extra al montar).
 */

import { useEffect, useState } from "react";

export function useDebouncedValue<T>(valor: T, retrasoMs = 300): T {
  const [valorDiferido, setValorDiferido] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => setValorDiferido(valor), retrasoMs);

    return () => clearTimeout(temporizador);
  }, [valor, retrasoMs]);

  return valorDiferido;
}
