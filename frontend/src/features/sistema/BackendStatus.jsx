import { useEffect, useState } from "react";
import { api } from "../../api/client";

const ESTADOS = {
  checking: "Comprobando...",
  online: "Backend conectado",
  offline: "Backend sin conexión",
};

export default function BackendStatus() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    api
      .health()
      .then(() => setStatus("online"))
      .catch(() => setStatus("offline"));
  }, []);

  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2">
      <span
        className={`inline-block w-3 h-3 rounded-full ${
          status === "online"
            ? "bg-green-500"
            : status === "offline"
              ? "bg-red-500"
              : "bg-yellow-500"
        }`}
      />
      <span>{ESTADOS[status]}</span>
    </div>
  );
}