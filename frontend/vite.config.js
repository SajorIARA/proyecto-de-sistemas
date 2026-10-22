import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	server: {
		allowedHosts: ["frontend", "localhost"],
		// Desarrollo fuera de Docker: sin esto, /api/* no llega al backend
		// (VITE_API_URL es relativo, "/api") y Vite responde el HTML del
		// SPA. En compose no hace falta: el nginx del proxy enruta /api/
		// hacia el backend (proxy/nginx.conf.template).
		proxy: {
			"/api": {
				target: "http://localhost:8000",
				changeOrigin: true,
			},
		},
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: "./src/test/setup.ts",
		css: true,
	},
});
