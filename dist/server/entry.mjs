import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_BbrlYNR0.mjs';
import { manifest } from './manifest_C6cSPj3v.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/api/get-token.astro.mjs');
const _page2 = () => import('./pages/room/_roomname_.astro.mjs');
const _page3 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/.pnpm/astro@5.5.5_@types+node@22.13.13_jiti@1.21.7_rollup@4.37.0_typescript@5.8.2_yaml@2.7.0/node_modules/astro/dist/assets/endpoint/node.js", _page0],
    ["src/pages/api/get-token.ts", _page1],
    ["src/pages/room/[roomName].astro", _page2],
    ["src/pages/index.astro", _page3]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./_noop-actions.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "mode": "standalone",
    "client": "file:///Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/dist/client/",
    "server": "file:///Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/dist/server/",
    "host": false,
    "port": 4321,
    "assets": "_astro"
};
const _exports = createExports(_manifest, _args);
const handler = _exports['handler'];
const startServer = _exports['startServer'];
const options = _exports['options'];
const _start = 'start';
if (_start in serverEntrypointModule) {
	serverEntrypointModule[_start](_manifest, _args);
}

export { handler, options, pageMap, startServer };
