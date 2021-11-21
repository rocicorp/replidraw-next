import { expect } from "chai";
import { setup, test } from "mocha";
import {
  createDatabase,
  delObject,
  getCookie,
  getClientRecord,
  getObject,
  putObject,
  setClientRecord,
  ClientRecord,
  mustGetClientRecord,
  mustGetClientRecords,
} from "./data";
import { withExecutor } from "./db";
import { ClientID } from "./server";

setup(async () => {
  await withExecutor(async () => {
    await createDatabase();
  });
});

test("put/get/del", async () => {
  await withExecutor(async (executor) => {
    expect(await getObject(executor, "doc1", "foo")).to.deep.equal([
      undefined,
      0,
    ]);

    await putObject(executor, "doc1", "foo", "bar", 1);
    expect(await getObject(executor, "doc1", "foo")).to.deep.equal(["bar", 1]);

    await putObject(executor, "doc1", "foo", "baz", 2);
    expect(await getObject(executor, "doc1", "foo")).to.deep.equal(["baz", 2]);

    await delObject(executor, "doc1", "foo", 3);
    expect(await getObject(executor, "doc1", "foo")).to.deep.equal([
      undefined,
      3,
    ]);
  });
});

test("set/getClientRecord", async () => {
  await withExecutor(async (executor) => {
    let err = "";
    try {
      await mustGetClientRecord(executor, "c1");
    } catch (e) {
      err = String(e);
    }
    expect(err).equals("Error: Unknown client: c1");
    expect(await getClientRecord(executor, "c1")).to.be.null;

    const expected: ClientRecord = {
      id: "c1",
      baseCookie: 42,
      lastMutationID: 7,
      documentID: "d1",
    };
    await setClientRecord(executor, expected);
    expect(await getClientRecord(executor, "c1")).to.deep.equal(expected);

    expected.baseCookie = 43;
    expected.lastMutationID = 8;
    await setClientRecord(executor, expected);
    expect(await getClientRecord(executor, "c1")).to.deep.equal(expected);
  });
});

test("mustGetClientRecords", async () => {
  await withExecutor(async (executor) => {
    const expected: ClientRecord[] = [
      {
        id: "c1",
        baseCookie: 42,
        lastMutationID: 7,
        documentID: "d1",
      },
      {
        id: "c2",
        baseCookie: 43,
        lastMutationID: 8,
        documentID: "d2",
      },
    ];
    for (const cr of expected) {
      await setClientRecord(executor, cr);
    }
    expect(await mustGetClientRecords(executor, ["c1", "c2"])).to.deep.equal(
      new Map(expected.map((cr) => [cr.id, cr] as [ClientID, ClientRecord]))
    );

    var err = "";
    try {
      await mustGetClientRecords(executor, ["c1", "c2", "c3"]);
    } catch (e) {
      err = String(e);
    }

    expect(err).equals("Error: Unknown client: c3");
  });
});

test("getCookie", async () => {
  await withExecutor(async (executor) => {
    // The default cookie when there's no data in a room is zero.
    expect(await getCookie(executor, "d1")).equal(0);

    // We always return the highest version on any row for the cookie
    await putObject(executor, "d1", "a", "a", 1);
    expect(await getCookie(executor, "d1")).equal(1);

    await putObject(executor, "d1", "b", "b", 2);
    expect(await getCookie(executor, "d1")).equal(2);

    // Resetting an existing key also affects getCookie
    await putObject(executor, "d1", "b", "b", 3);
    expect(await getCookie(executor, "d1")).equal(3);

    // Note: this means resetting a version *down* can have unexpected effects
    // Our code should never do this.
    await putObject(executor, "d1", "b", "b", 1);
    expect(await getCookie(executor, "d1")).equal(1);

    // delObject affects version too.
    await delObject(executor, "d1", "a", 3);
    expect(await getCookie(executor, "d1")).equal(3);

    // Versions are per-room
    await putObject(executor, "d2", "foo", "bar", 10);
    expect(await getCookie(executor, "d1")).equal(3);
    expect(await getCookie(executor, "d2")).equal(10);
  });
});
