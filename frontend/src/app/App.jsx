import BackendStatus from "../features/sistema/BackendStatus";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-900">
      <h1 className="text-4xl font-bold mb-4">Turismo Melgarejo</h1>
      <p className="text-lg mb-6">Sistema turístico de La Paz</p>
      <BackendStatus />
    </div>
  );
}