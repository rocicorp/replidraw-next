import { getLastMutationID } from "./client";
import { pullRequestSchema } from "./replicache-protocol-schemas";
import { PullResponse } from "./replicache-protocol-types";

export async function handlePull(storage: DurableObjectStorage, req: Request): Promise<Response> {
  const body = pullRequestSchema.parse(await req.json());
  const lmid = await getLastMutationID(storage, body.clientID);
  const response: PullResponse = {
    lastMutationID: lmid,
    cookie: null,
    // TODO: Actually compute a patch
    patch: [
      { op: "clear" },
      ...[...await storage.list()].map(([key, value]) => ({
        op: "put" as const,
        key,
        value,
      }))
    ],
  };
  return new Response(JSON.stringify(response, null, 2), {status: 200});
}
