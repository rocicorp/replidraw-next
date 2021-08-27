import { z } from "zod";

export async function getLastMutationID(
  durable: DurableObjectOperator,
  clientID: string
): Promise<number> {
  const lastMutationID = await durable.get(lmidKey(clientID));
  return z.number().int().positive().optional().parse(lastMutationID) ?? 0;
}

export async function setLastMutationID(
  durable: DurableObjectOperator,
  clientID: string,
  value: number
): Promise<void> {
  await durable.put(lmidKey(clientID), value);
}

const lmidKey = (clientID: string) => `/sys/client/${clientID}`;
