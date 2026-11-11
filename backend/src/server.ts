import { app } from "./app.js";
import { env } from "./config/env.js";
const server = app.listen(env.PORT, "0.0.0.0", () =>
  console.log(`GESTION API prête sur le port ${env.PORT}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close(() => process.exit(0)));
