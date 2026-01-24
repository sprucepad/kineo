import process from "node:process";
import { createJiti, type JitiResolveOptions } from "jiti";

export const CWD = process.cwd();
export const jiti = createJiti(CWD);

export async function tryImport(
  id: string,
  opts?: JitiResolveOptions & { default?: true },
): Promise<any> {
  try {
    return jiti.import("./" + id, opts);
  } catch {
    return jiti.import("./" + id.split(".").slice(0, -1).join("."), opts);
  }
}
