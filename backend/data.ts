// Our SQL-Level data model.

import { JSONValue } from "replicache";
import { Executor, transact } from "./db";
import { ClientID } from "./server";

export async function createDatabase() {
  await transact(async (executor) => {
    // TODO: Proper versioning for schema.
    await executor("drop table if exists client cascade");
    await executor("drop table if exists object cascade");

    await executor(`create table client (
      id varchar(100) primary key not null,
      basecookie int null,
      lastmutationid int not null,
      documentid varchar(100) not null)`);

    await executor(`create table object (
      k varchar(100) not null,
      v text not null,
      documentid varchar(100) not null,
      deleted bool not null default false,
      version int not null,
      unique (documentid, k)
      )`);

    await executor(`create index on object (documentid)`);
    await executor(`create index on object (deleted)`);
    await executor(`create index on object (version)`);
  });
}

export type ClientRecord = {
  id: string;
  baseCookie: number | null;
  lastMutationID: number;
  documentID: string;
};

export async function getCookie(
  executor: Executor,
  docID: string
): Promise<number> {
  const result = await executor(
    "select max(version) as cookie from object where documentid = $1",
    [docID]
  );
  return result.rows[0]?.cookie ?? 0;
}

export async function mustGetClientRecord(
  executor: Executor,
  clientID: string
): Promise<ClientRecord> {
  const result = await getClientRecord(executor, clientID);
  if (result === null) {
    throw new Error(`Unknown client: ${clientID}`);
  }
  return result;
}

export async function getClientRecord(
  executor: Executor,
  clientID: string
): Promise<ClientRecord | null> {
  const result = await executor(
    "select basecookie, lastmutationid, documentid from client where id = $1",
    [clientID]
  );
  if (result.rows.length === 0) {
    return null;
  }
  const [row] = result.rows;
  const res = {
    id: clientID,
    baseCookie: row.basecookie,
    lastMutationID: row.lastmutationid,
    documentID: row.documentid,
  };
  console.log("getClientRecord", JSON.stringify(res));
  return res;
}

export async function mustGetClientRecords(
  executor: Executor,
  clientIDs: ClientID[]
): Promise<Map<ClientID, ClientRecord>> {
  const records = await Promise.all(
    clientIDs.map((clientID) => mustGetClientRecord(executor, clientID))
  );
  const entries = records.map(
    (record) => [record.id, record] as [ClientID, ClientRecord]
  );
  return new Map(entries);
}

export async function setClientRecord(
  executor: Executor,
  record: ClientRecord
): Promise<void> {
  console.log("Saving clientRecord", JSON.stringify(record));
  await executor(
    "insert into client (id, basecookie, lastmutationid, documentid) values ($1, $2, $3, $4) " +
      "on conflict (id) do update set basecookie = $2, lastmutationid = $3, documentid = $4",
    [record.id, record.baseCookie, record.lastMutationID, record.documentID]
  );
}

/**
 * Returns the value and version for some key in the database.
 *
 * Because the database implements delete with soft deletes, the value can be
 * undefined while the verison is > 0.
 */
export async function getObject(
  executor: Executor,
  documentID: string,
  key: string
): Promise<[JSONValue | undefined, number]> {
  const {
    rows,
  } = await executor(
    "select v, deleted, version from object where documentid = $1 and k = $2",
    [documentID, key]
  );
  const [row] = rows;
  if (!row) {
    return [undefined, 0];
  }
  const { v, deleted, version } = row;
  return [deleted ? undefined : JSON.parse(v), version];
}

export async function putObject(
  executor: Executor,
  docID: string,
  key: string,
  value: JSONValue,
  version: number
): Promise<void> {
  await executor(
    `
    insert into object (documentid, k, v, deleted, version)
    values ($1, $2, $3, false, $4)
      on conflict (documentid, k) do update set v = $3, deleted = false, version = $4
    `,
    [docID, key, JSON.stringify(value), version]
  );
}

export async function delObject(
  executor: Executor,
  docID: string,
  key: string,
  version: number
): Promise<void> {
  await executor(
    `
    update object set deleted = true, version = $3
    where documentid = $1 and k = $2
  `,
    [docID, key, version]
  );
}
