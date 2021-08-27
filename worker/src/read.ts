import { JSONValue, ReadTransaction, ScanOptions, ScanResult } from "replicache"
import { z } from "zod";
import { usrKey } from "./key";

const entrySchema = z.object({
  modified: z.number(),
  value: z.any(),
});

export class Read implements ReadTransaction {
  protected durable: DurableObjectOperator;

  constructor(durable: DurableObjectOperator) {
    this.durable = durable;
  }

  async get(key: string): Promise<JSONValue|undefined> {
    const entry = entrySchema.parse(await this.durable.get(usrKey(key)));
    return entry.value;
  }

  async has(key: string): Promise<boolean> {
    return (await this.durable.get(usrKey(key))) !== undefined;
  }

  async set(key: string, value: JSONValue): Promise<void> {
    await this.durable.put(usrKey(key), value);
  }

  async isEmpty(): Promise<boolean> {
    return (await this.durable.list({limit: 1})).size !== 0;
  }

  scan(options?: ScanOptions): ScanResult<string> {
    throw new Error("unsupported");
  }

  scanAll(): Promise<[string, JSONValue][]> {
    throw new Error("unsupported");
  }
}
