import { Application, Router, type ServerSentEventTarget } from "@oak/oak";
import logger from "@quirkware/logger";
import { cors, type CorsOptions } from "@momiji/cors";

const corsOptions: CorsOptions = {
  origin: "*",
  allowMethods: ["GET", "POST"],
  allowHeaders: ["Content-Type"],
  credentials: true,
  maxAge: 86400,
};

const channels: Record<string, ServerSentEventTarget> = {};

const router = new Router();

router.get("/", (ctx) => {
  ctx.response.body = "Hello from signaling server!";
});

router.get("/:id", (ctx) => {
  ctx.response.body = `Hello ${ctx.params.id}!`;
});

router.post("/:id", async (ctx) => {
  const target = channels[ctx.params.id];
  if (target) {
    const data = await ctx.request.body.json();
    target.dispatchMessage(data);
    ctx.response.status = 200;
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
  ctx.response.status = 202;
  const id = ctx.params.id;
  const target = await ctx.sendEvents();
  channels[id] = target;
  target.addEventListener("close", () => {
    console.log("close", id);
    delete channels[id];
  });
});

const app = new Application();
app.use(logger());
app.use(cors(corsOptions));
app.use(router.routes());
app.use(router.allowedMethods());
app.listen({ hostname: "0.0.0.0", port: 8000 });
