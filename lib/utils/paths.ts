// Core ============================================================================================
import { resolve } from "path";

// ============================================================================================== \\
// =========================================== Paths ============================================ \\
// ============================================================================================== \\
/**
 * @module paths
 * Module containing all common paths.
 */

const root = resolve(__dirname, "..", "..");
const lib = resolve(root, "lib");
const stacks = resolve(lib, "stacks");
const coreStacks = resolve(stacks, "core");

export const projects = resolve(root, "projects");
export const defaultPage = resolve(coreStacks, "default.html");
export const services = resolve(lib, "services");
export const targetGroupsPriorities = resolve(services, "target-groups-priorities.json");

// ============================================================================================== \\
// ============================================================================================== \\
