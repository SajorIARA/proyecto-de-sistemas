import { useEffect, useState } from "react";
import { api } from "./api/client";

export default function App() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    api
      .health()
      .then(() => setStatus("online"))
      .catch(() => setStatus("offline"));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-900">
      <h1 className="text-4xl font-bold mb-4">Turismo Melgarejo</h1>
      <p className="text-lg mb-6">Sistema turístico de La Paz</p>
      <div className="flex items-center gap-2">
        <span
          className={`inline-block w-3 h-3 rounded-full ${
            status === "online" ? "bg-green-500" : status === "offline" ? "bg-red-500" : "bg-yellow-500"
          }`}
        />
        <span>
          {status === "online"
            ? "Backend conectado"
            : status === "offline"
              ? "Backend sin conexión"
              : "Comprobando..."}
        </span>
      </div>
    </div>
  );
}
