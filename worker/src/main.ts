// This is the Edge Chat Demo Worker, built using Durable Objects!

import { handlePull } from "./pull";
import { handlePush } from "./push";

// ===============================
// Introduction to Modules
// ===============================
//
// The first thing you might notice, if you are familiar with the Workers platform, is that this
// Worker is written differently from others you may have seen. It even has a different file
// extension. The `mjs` extension means this JavaScript is an ES Module, which, among other things,
// means it has imports and exports. Unlike other Workers, this code doesn't use
// `addEventListener("fetch", handler)` to register its main HTTP handler; instead, it _exports_
// a handler, as we'll see below.
//
// This is a new way of writing Workers that we expect to introduce more broadly in the future. We
// like this syntax because it is *composable*: You can take two workers written this way and
// merge them into one worker, by importing the two Workers' exported handlers yourself, and then
// exporting a new handler that call into the other Workers as appropriate.
//
// This new syntax is required when using Durable Objects, because your Durable Objects are
// implemented by classes, and those classes need to be exported. The new syntax can be used for
// writing regular Workers (without Durable Objects) too, but for now, you must be in the Durable
// Objects beta to be able to use the new syntax, while we work out the quirks.
//
// To see an example configuration for uploading module-based Workers, check out the wrangler.toml
// file or one of our Durable Object templates for Wrangler:
//   * https://github.com/cloudflare/durable-objects-template
//   * https://github.com/cloudflare/durable-objects-rollup-esm
//   * https://github.com/cloudflare/durable-objects-webpack-commonjs

// ===============================
// Required Environment
// ===============================
//
// This worker, when deployed, must be configured with two environment bindings:
// * rooms: A Durable Object namespace binding mapped to the Room class.
// * limiters: A Durable Object namespace binding mapped to the RateLimiter class.
//
// Incidentally, in pre-modules Workers syntax, "bindings" (like KV bindings, secrets, etc.)
// appeared in your script as global variables, but in the new modules syntax, this is no longer
// the case. Instead, bindings are now delivered in an "environment object" when an event handler
// (or Durable Object class constructor) is called. Look for the variable `env` below.
//
// We made this change, again, for composability: The global scope is global, but if you want to
// call into existing code that has different environment requirements, then you need to be able
// to pass the environment as a parameter instead.
//
// Once again, see the wrangler.toml file to understand how the environment is configured.

// In modules-syntax workers, we use `export default` to export our script's main event handlers.
// Here, we export one handler, `fetch`, for receiving HTTP requests. In pre-modules workers, the
// fetch handler was registered using `addEventHandler("fetch", event => { ... })`; this is just
// new syntax for essentially the same thing.
//
// `fetch` isn't the only handler. If your worker runs on a Cron schedule, it will receive calls
// to a handler named `scheduled`, which should be exported here in a similar way. We will be
// adding other handlers for other types of events over time.
export default {
  async fetch(request: Request, env: {[key: string]: DurableObjectNamespace}): Promise<Response> {
    console.log("handling request for", request.url);
    const url = new URL(request.url);
    const docID = url.searchParams.get("docID");

    if (!docID) {
      return new Response("Missing docID parameter", { status: 400 });
    }

    // Get the Durable Object stub for this room! The stub is a client object that can be used
    // to send messages to the remote Durable Object instance. The stub is returned immediately;
    // there is no need to await it. This is important because you would not want to wait for
    // a network round trip before you could start sending requests. Since Durable Objects are
    // created on-demand when the ID is first used, there's nothing to wait for anyway; we know
    // an object will be available somewhere to receive our requests.
    const roomObject = env.rooms.get(env.rooms.idFromName(docID));
    return roomObject.fetch(request.url, request);
  }
}

// =======================================================================================
// The Chat Durable Object Class

// Chat implements a Durable Object that coordinates an individual Replicache "room".
export class Room {
  private storage: DurableObjectStorage;

  constructor(controller: DurableObjectState) {
    // `controller.storage` provides access to our durable storage. It provides a simple KV
    // get()/put() interface.
    this.storage = controller.storage;
  }

  // The system will call fetch() whenever an HTTP request is sent to this Object. Such requests
  // can only be sent from other Worker code, such as the code above; these requests don't come
  // directly from the internet. In the future, we will support other formats than HTTP for these
  // communications, but we started with HTTP for its familiarity.
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/replicache-push":
        return await handlePush(this.storage, request);
      case "/replicache-pull":
        return await handlePull(this.storage, request);
      default:
        return new Response("Not found", {status: 404});
    }
  }
}
