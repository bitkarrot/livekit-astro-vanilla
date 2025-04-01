import { e as createComponent, f as createAstro, l as renderHead, n as renderSlot, r as renderTemplate } from './astro/server_tN532GVR.mjs';

const $$Astro = createAstro();
const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Layout;
  const { title } = Astro2.props;
  return renderTemplate`<html lang="en"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title>${renderHead()}</head> <body class="bg-gray-900 h-screen flex flex-col"> ${renderSlot($$result, $$slots["default"])} </body></html>`;
}, "/Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/src/layouts/Layout.astro", void 0);

export { $$Layout as $ };
