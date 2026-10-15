/**
 * Seed diagnostics — make a failed `payload.create` name its document.
 *
 * Payload 3.90's validation errors carry neither collection nor field ("list
 * node failed to validate: List tag must be one of ol, ul."), which cost the
 * first upgrade attempt two blind hypotheses (T-10). Call this once in a
 * runner, before any seed function: it shadows `create` on the payload
 * instance so every failed create — in any seed module — logs its collection
 * and its WHOLE document before rethrowing. The instance-level override is
 * safe here: runners are standalone, short-lived processes.
 */
type CreateArgs = { collection: string; data: Record<string, unknown> }

export function installSeedDiagnostics(payload: {
  create: (...args: never[]) => Promise<unknown>
}): void {
  const original = payload.create.bind(payload) as (args: CreateArgs) => Promise<unknown>
  payload.create = async (args: CreateArgs) => {
    try {
      return await original(args)
    } catch (error) {
      console.error(
        `[seed] create failed in collection "${args.collection}" — whole document follows:`,
      )
      console.error(JSON.stringify(args.data, null, 2))
      // Payload's ValidationError carries a structured `data.errors` array with
      // the per-field path and message — the node path that actually failed.
      const details = (error as { data?: { errors?: unknown } }).data?.errors
      if (details) console.error('[seed] field errors:', JSON.stringify(details, null, 2))
      throw error
    }
  }
}
