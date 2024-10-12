import { Application, Router, type ServerSentEventTarget } from "@oak/oak";

const channels: Record<string, ServerSentEventTarget> = {};

const router = new Router();

router.get("/", (ctx) => {
  ctx.response.body = "Hello World!";
});

router.get("/:id", (ctx) => {
  ctx.response.body = `Hello ${ctx.params.id}!`;
});

router.post("/:id", (ctx) => {
  const target = channels[ctx.params.id];
  if (target) {
    target.dispatchMessage(ctx.request.body);
  } else {
    ctx.response.status = 404;
    ctx.response.body = "Id not found";
  }
});

router.get("/sse/:id", async (ctx) => {
  if (ctx.params.id in channels) {
    ctx.response.status = 400;
    ctx.response.body = "Id already exists";
    return;
  }
  ctx.response.headers.set("content-type", "application/json");
  const id = ctx.params.id;
  const target = await ctx.sendEvents();
  channels[id] = target;
  target.addEventListener("close", () => {
    delete channels[id];
  });
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());
app.listen({ port: 8000 });
