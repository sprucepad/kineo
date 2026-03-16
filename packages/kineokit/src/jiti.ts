import process from "node:process";
import { createJiti, type JitiResolveOptions } from "jiti";

export const CWD = process.cwd();
export const jiti = createJiti(CWD);

export async function tryImport(
  id: string,
  opts?: JitiResolveOptions & { default?: true },
): Promise<any> {
  try {
    return jiti.import("./" + id.replace(/\.[^.]+$/, ""), opts);
  } catch {
    return jiti.import("./" + id, opts);
  }
}
