/**
 * Validación de contraseñas en el cliente.
 *
 * Replica solo las reglas duras de Django (`AUTH_PASSWORD_VALIDATORS` en
 * `backend/config/settings.py`): longitud mínima, contraseñas comunes,
 * similitud con los datos del usuario y contraseñas puramente numéricas.
 * El backend sigue siendo la autoridad final; aquí se evita un viaje de
 * red y se da retroalimentación inmediata.
 *
 * La "fuerza" (puntaje 0-4) es solo informativa: no bloquea el envío.
 */

export type IdRequisito = "longitud" | "numeros" | "comun" | "personal";

export interface RequisitoContrasena {
  id: IdRequisito;
  etiqueta: string;
  cumple: boolean;
}

export interface EvaluacionContrasena {
  requisitos: RequisitoContrasena[];
  /** 0 = vacía; 1 = muy débil; 2 = aceptable; 3 = buena; 4 = excelente. */
  puntaje: 0 | 1 | 2 | 3 | 4;
  /** Mensajes de las reglas duras incumplidas, en orden de prioridad. */
  errores: string[];
}

export const LARGO_MINIMO_CONTRASENA = 8;

/**
 * Subconjunto de contraseñas comunes. Todas están en la lista de Django,
 * así que bloquearlas aquí nunca rechaza algo que el backend aceptaría.
 */
const CLAVES_COMUNES = new Set([
  "123456",
  "1234567",
  "12345678",
  "123456789",
  "1234567890",
  "111111",
  "000000",
  "123123",
  "654321",
  "abc123",
  "qwerty",
  "qwerty123",
  "password",
  "password1",
  "passw0rd",
  "iloveyou",
  "admin",
  "admin123",
  "welcome",
  "monkey",
  "dragon",
  "football",
  "baseball",
  "starwars",
  "superman",
  "trustno1",
  "letmein",
  "master",
  "freedom",
  "whatever",
  "contraseña",
  "contrasena",
  "bienvenido",
  "holamundo",
]);

const NIVELES = [
  { etiqueta: "Sin contraseña", color: "#D9D1C3" },
  { etiqueta: "Muy débil", color: "#9A5B3C" },
  { etiqueta: "Aceptable", color: "#C6923B" },
  { etiqueta: "Buena", color: "#6F8064" },
  { etiqueta: "Excelente", color: "#2F4B3B" },
] as const;

export function nivelContrasena(puntaje: EvaluacionContrasena["puntaje"]) {
  return NIVELES[puntaje];
}

/** Minúsculas y sin tildes ni separadores, para comparar de forma estable. */
function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** ¿La contraseña contiene el nombre o el correo del usuario? */
function parecePersonal(
  password: string,
  nombre: string,
  email: string,
): boolean {
  const clave = normalizar(password);

  if (!clave) return false;

  const partes = [nombre, email.split("@")[0] ?? ""]
    .flatMap((valor) => valor.split(/[^A-Za-z0-9]+/))
    .map(normalizar)
    .filter((parte) => parte.length >= 4);

  return partes.some((parte) => clave.includes(parte));
}

function calcularPuntaje(valor: string): EvaluacionContrasena["puntaje"] {
  if (!valor) return 0;

  const variedad = [
    /[a-z]/.test(valor),
    /[A-Z]/.test(valor),
    /\d/.test(valor),
    /[^A-Za-z0-9]/.test(valor),
  ].filter(Boolean).length;

  let puntaje = valor.length >= 12 ? 3 : valor.length >= 8 ? 2 : 1;

  if (variedad >= 3) puntaje += 1;
  if (variedad <= 1) puntaje -= 1;

  return Math.min(4, Math.max(1, puntaje)) as EvaluacionContrasena["puntaje"];
}

export function evaluarContrasena(
  password: string,
  { nombre, email }: { nombre: string; email: string },
): EvaluacionContrasena {
  const valor = password;
  const soloNumeros = valor.length > 0 && /^\d+$/.test(valor);

  const requisitos: RequisitoContrasena[] = [
    {
      id: "longitud",
      etiqueta: `Al menos ${LARGO_MINIMO_CONTRASENA} caracteres`,
      cumple: valor.length >= LARGO_MINIMO_CONTRASENA,
    },
    {
      id: "numeros",
      etiqueta: "No puede ser solo números",
      cumple: valor.length > 0 && !soloNumeros,
    },
    {
      id: "comun",
      etiqueta: "No puede ser una contraseña común",
      cumple: valor.length > 0 && !CLAVES_COMUNES.has(valor.toLowerCase()),
    },
    {
      id: "personal",
      etiqueta: "No puede parecerse a tu nombre o correo",
      cumple: valor.length > 0 && !parecePersonal(valor, nombre, email),
    },
  ];

  const errores: string[] = [];
  const incumplidos = new Set(
    requisitos.filter((requisito) => !requisito.cumple).map((r) => r.id),
  );

  if (incumplidos.has("longitud")) {
    errores.push(
      `Usa al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`,
    );
  }

  if (incumplidos.has("numeros")) {
    errores.push("La contraseña no puede ser solo números.");
  }

  if (incumplidos.has("comun")) {
    errores.push("Elige una contraseña menos común.");
  }

  if (incumplidos.has("personal")) {
    errores.push("La contraseña no puede parecerse a tu nombre o correo.");
  }

  return {
    requisitos,
    puntaje: calcularPuntaje(valor),
    errores,
  };
}
