import { pushRequestSchema } from "./replicache-protocol-schemas";
import type { Mutation } from "./replicache-protocol-types";
import { mutators } from "../../shared/mutators";
import { Write } from "./write";
import { getLastMutationID, setLastMutationID } from "./client";

export async function handlePush(storage: DurableObjectStorage, req: Request): Promise<Response> {
  const body = pushRequestSchema.parse(await req.json());
  const runTransaction = async (txn: DurableObjectTransaction) => {
    let lastMutationID = await getLastMutationID(txn, body.clientID);
    const write = new Write(txn, Date.now()); 

    for (const mutation of body.mutations) {
      const expectedMutationID = lastMutationID + 1;

      if (mutation.id < expectedMutationID) {
        console.log(`Skipping already processed mutation id: ${mutation.id}`);
        continue;
      }

      if (mutation.id > expectedMutationID) {
        return new Response(`Mutation id too high - expected mutationID: ${expectedMutationID}, got: ${mutation.id}`, {status: 400});
      }

      try {
        await applyMutation(write, mutation);
        lastMutationID = mutation.id;
        await setLastMutationID(txn, body.clientID, lastMutationID);
      } catch (e) {
        console.error(e);
        return new Response(e.message, {status: 400});
      }
    }

    return new Response("👍", {status: 200});
  };

  let response: Response|undefined = undefined;
  storage.transaction(async (txn: DurableObjectTransaction) => {
    response = await runTransaction(txn);
  });

  return response as unknown as Response;
}

async function applyMutation(write: Write, mutation: Mutation): Promise<void> {
  // TODO: do better
  // TODO: validate inputs
  const mutator = (mutators as any)[mutation.name];
  if (!mutator) {
    throw new Error(`Unknown mutation: ${mutation.name}`);
  }
  await mutator(write, ...(mutation.args ?? []));
}
