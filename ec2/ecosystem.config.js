/**
 * ZenG Trade — PM2 Ecosystem Config
 * Manages the ws-proxy.js process with auto-restart, logging, and env management.
 */
module.exports = {
    apps: [
        {
            name: "zeng-ws-proxy",
            script: "./ws-proxy.js",
            instances: 1,
            exec_mode: "fork",
            autorestart: true,
            watch: false,
            max_memory_restart: "512M",
            restart_delay: 3000,
            max_restarts: 20,

            env: {
                NODE_ENV: "production",
                WS_PORT: 8080,
                API_PORT: 8081,
                // KITE_API_KEY: Set via /etc/environment or PM2 env file
                // See README.md for setup
            },

            log_date_format: "YYYY-MM-DD HH:mm:ss Z",
            error_file: "./logs/proxy-error.log",
            out_file: "./logs/proxy-out.log",
            merge_logs: true,

            // Health monitoring
            min_uptime: "10s",
            listen_timeout: 8000,
            kill_timeout: 5000,
        }
    ]
};
