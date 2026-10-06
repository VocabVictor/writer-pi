import { restoreSandboxEnv } from "./env.ts";

// Restore the environment before evaluating modules that read it at startup.
restoreSandboxEnv();
