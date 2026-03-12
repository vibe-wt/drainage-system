import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
    plugins: [react()],
    server: {
        port: 4173,
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: function (id) {
                    if (id.indexOf("node_modules/react-router") !== -1 || id.indexOf("node_modules/@remix-run") !== -1) {
                        return "router";
                    }
                    if (id.indexOf("node_modules/ol/") !== -1) {
                        return "openlayers";
                    }
                    if (id.indexOf("/src/widgets/map-canvas/") !== -1) {
                        return "map-canvas";
                    }
                    if (id.indexOf("/src/features/map-core/") !== -1 || id.indexOf("/src/features/map-editing/") !== -1) {
                        return "map-features";
                    }
                    if (id.indexOf("/src/pages/dashboard/") !== -1) {
                        return "dashboard";
                    }
                    if (id.indexOf("/src/pages/analysis-center/") !== -1) {
                        return "analysis";
                    }
                    if (id.indexOf("/src/pages/import-management/") !== -1) {
                        return "imports";
                    }
                    if (id.indexOf("/src/pages/map-workbench/") !== -1) {
                        return "map-workbench";
                    }
                    return undefined;
                },
            },
        },
    },
    test: {
        environment: "jsdom",
        globals: false,
    },
});
