# Replidraw Worker

## Deploy

Join the Durable Objects beta by visiting the [Cloudflare dashboard](https://dash.cloudflare.com/) and navigating to "Workers" and then "Durable Objects".

Then, make sure you have [Wrangler](https://developers.cloudflare.com/workers/cli-wrangler/install-update), the official Workers CLI, installed. Version 1.17 or newer is required for Durable Objects support.

After installing it, run `wrangler login` to [connect it to your Cloudflare account](https://developers.cloudflare.com/workers/cli-wrangler/authentication).

Once you're in the Durable Objects beta and have Wrangler installed and authenticated, you can deploy the app for the first time by adding your Cloudflare account ID (which can be viewed by running `wrangler whoami`) to the wrangler.toml file and then running:

    wrangler publish --new-class Room

If you get an error about the `--new-class` flag not being recognized, you need to update your version of Wrangler.

This command will deploy the app to your account under the name `edge-chat-demo`. The `--new-class` flags tell Cloudflare that you want the `ChatRoom` and `RateLimiter` classes to be callable as Durable Objects. The flags should be omitted on subsequent uploads of the same Worker because at that point the classes are already configured as Durable Objects.
