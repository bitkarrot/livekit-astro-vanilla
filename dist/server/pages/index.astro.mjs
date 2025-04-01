/* empty css                                 */
import { e as createComponent, k as renderComponent, i as renderScript, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_tN532GVR.mjs';
import { $ as $$Layout } from '../chunks/Layout_C5ur_d2Y.mjs';
export { renderers } from '../renderers.mjs';

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Hivetalk Video Conference" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4"> <div class="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-8"> <div class="text-center mb-8"> <h1 class="text-3xl font-bold text-white mb-2">Hivetalk</h1> <p class="text-gray-300">Secure video conferencing for teams</p> </div> <div class="space-y-6"> <button id="start-meeting" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200">
Start New Meeting
</button> <div class="relative"> <div class="absolute inset-0 flex items-center"> <div class="w-full border-t border-gray-600"></div> </div> <div class="relative flex justify-center text-sm"> <span class="px-2 bg-gray-800 text-gray-400">or</span> </div> </div> <div> <label for="join-room" class="block text-sm font-medium text-gray-300 mb-2">Join with a room code</label> <div class="flex"> <input type="text" id="join-room" class="flex-1 bg-gray-700 text-white rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter room code"> <button id="join-meeting" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-r-lg transition duration-200">
Join
</button> </div> </div> </div> <div class="mt-8 text-center text-sm text-gray-400"> <p>By using this service, you agree to our <a href="#" class="text-blue-400 hover:underline">Terms of Service</a> and <a href="#" class="text-blue-400 hover:underline">Privacy Policy</a>.</p> </div> </div> </div> ` })} ${renderScript($$result, "/Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/src/pages/index.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/src/pages/index.astro", void 0);

const $$file = "/Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
