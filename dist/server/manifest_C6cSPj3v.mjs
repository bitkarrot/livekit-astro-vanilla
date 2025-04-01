import { o as decodeKey } from './chunks/astro/server_tN532GVR.mjs';
import { N as NOOP_MIDDLEWARE_FN } from './chunks/astro-designed-error-pages_BrNe_hXq.mjs';

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? "/" + segmentPath : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
    origin: rawRouteData.origin
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}

const manifest = deserializeManifest({"hrefRoot":"file:///Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/","cacheDir":"file:///Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/node_modules/.astro/","outDir":"file:///Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/dist/","srcDir":"file:///Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/src/","publicDir":"file:///Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/public/","buildClientDir":"file:///Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/dist/client/","buildServerDir":"file:///Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/dist/server/","adapterName":"@astrojs/node","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_image","pattern":"^\\/_image\\/?$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/.pnpm/astro@5.5.5_@types+node@22.13.13_jiti@1.21.7_rollup@4.37.0_typescript@5.8.2_yaml@2.7.0/node_modules/astro/dist/assets/endpoint/node.js","pathname":"/_image","prerender":false,"fallbackRoutes":[],"origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/get-token","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/get-token\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"get-token","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/get-token.ts","pathname":"/api/get-token","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/index.Cqw9el9J.css"},{"type":"inline","content":".participant-box{border:2px solid #4B5563;box-shadow:0 0 0 1px #ffffff1a;transition:all .2s ease-in-out;padding:16px;display:flex;flex-direction:column;justify-content:center;align-items:center;position:relative}.participant-box:hover{border-color:#60a5fa}.grid-container{display:grid;gap:8px;width:100%;height:100%;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}@media (max-width: 600px){.mobile-grid{grid-template-columns:1fr!important;gap:8px}.mobile-tile{height:160px!important;min-height:160px!important;max-height:160px!important;margin-bottom:0!important}}@media (max-width: 900px) and (orientation: landscape){.grid-container{grid-template-columns:repeat(2,1fr)!important;gap:8px}.participant-container{height:140px!important;min-height:140px!important;max-height:140px!important}}.avatar{display:flex;align-items:center;justify-content:center;border-radius:50%;font-weight:700;color:#fff;width:80px;height:80px}.avatar-container{display:flex;justify-content:center;align-items:center;width:100%;height:100%}.stretch-container{height:100%}.expand-button{position:absolute;top:8px;right:8px;background:#00000080;border-radius:4px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s ease;z-index:10}.expand-button:hover{background:#000000b3}.expanded-view{position:absolute;top:0;left:0;width:100%;height:100%;z-index:100;display:flex}.sidebar{width:180px;height:100%;overflow-y:auto;overflow-x:hidden;background-color:#1f2937;padding:8px;display:flex;flex-direction:column;gap:4px}.sidebar-tile{width:100%;height:100px;flex-shrink:0;margin-bottom:4px}.main-content{flex:1;padding:8px;background-color:#111827}.sidebar::-webkit-scrollbar{display:none}.sidebar{-ms-overflow-style:none;scrollbar-width:none}.video-preview{aspect-ratio:16/9;width:100%;max-width:640px;background-color:#111;border-radius:8px;overflow:hidden;margin-bottom:1rem;display:flex;align-items:center;justify-content:center}.video-preview svg{width:120px;height:120px;color:#444}.device-control{position:relative;margin-bottom:1rem;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif}.device-button-group{display:flex;width:100%;border-radius:4px;overflow:hidden}.device-toggle{flex-grow:1;display:flex;align-items:center;padding:.5rem 1rem;background-color:#1f2937;color:#fff;cursor:pointer;border:none;border-right:1px solid #374151;font-size:.9rem}.device-toggle.disabled{background-color:#374151}.device-toggle.disabled svg{color:#9ca3af}.device-dropdown-button{width:36px;display:flex;align-items:center;justify-content:center;background-color:#1f2937;color:#fff;cursor:pointer;border:none}.device-dropdown{position:absolute;bottom:100%;left:0;right:0;padding:.25rem;background-color:#374151;color:#fff;border-radius:4px;margin-bottom:.25rem;z-index:10;max-height:200px;overflow-y:auto;box-shadow:0 10px 15px -3px #0000001a,0 4px 6px -2px #0000000d}.device-dropdown button{display:block;width:100%;padding:1rem 1.25rem;text-align:left;background-color:#374151;border:none;color:#fff!important;cursor:pointer;font-size:.9rem;border-bottom:1px solid #4b5563;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif}.device-dropdown button:last-child{background-color:#374151;color:#fff!important;border-bottom:none}.device-dropdown button:hover{color:#fff!important;background-color:#4b5563}.device-dropdown button.active{background-color:#2563eb!important;color:#fff!important;font-weight:500}.icon-container{position:relative;display:inline-flex;margin-right:.5rem}.slash-icon{position:absolute;top:0;left:0;color:#ef4444;display:none}.disabled .slash-icon{display:block}\n"}],"routeData":{"route":"/room/[roomname]","isIndex":false,"type":"page","pattern":"^\\/room\\/([^/]+?)\\/?$","segments":[[{"content":"room","dynamic":false,"spread":false}],[{"content":"roomName","dynamic":true,"spread":false}]],"params":["roomName"],"component":"src/pages/room/[roomName].astro","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/index.Cqw9el9J.css"}],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}}],"base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["/Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/src/pages/index.astro",{"propagation":"none","containsHead":true}],["/Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/src/pages/room/[roomName].astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000noop-middleware":"_noop-middleware.mjs","\u0000noop-actions":"_noop-actions.mjs","\u0000@astro-page:src/pages/api/get-token@_@ts":"pages/api/get-token.astro.mjs","\u0000@astro-page:src/pages/room/[roomName]@_@astro":"pages/room/_roomname_.astro.mjs","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astrojs-ssr-virtual-entry":"entry.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000@astro-page:node_modules/.pnpm/astro@5.5.5_@types+node@22.13.13_jiti@1.21.7_rollup@4.37.0_typescript@5.8.2_yaml@2.7.0/node_modules/astro/dist/assets/endpoint/node@_@js":"pages/_image.astro.mjs","\u0000@astrojs-ssr-adapter":"_@astrojs-ssr-adapter.mjs","\u0000@astrojs-manifest":"manifest_C6cSPj3v.mjs","/Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/node_modules/.pnpm/astro@5.5.5_@types+node@22.13.13_jiti@1.21.7_rollup@4.37.0_typescript@5.8.2_yaml@2.7.0/node_modules/astro/dist/assets/services/sharp.js":"chunks/sharp_CR6Klrw8.mjs","/Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/src/components/VideoConference.astro?astro&type=script&index=2&lang.ts":"_astro/VideoConference.astro_astro_type_script_index_2_lang.BJZfoa6Q.js","/Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/src/pages/index.astro?astro&type=script&index=0&lang.ts":"_astro/index.astro_astro_type_script_index_0_lang.CTzvwGEu.js","/Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/src/components/VideoConference.astro?astro&type=script&index=0&lang.ts":"_astro/VideoConference.astro_astro_type_script_index_0_lang.DE3OY0YB.js","/Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/src/components/VideoConference.astro?astro&type=script&index=1&lang.ts":"_astro/VideoConference.astro_astro_type_script_index_1_lang.CBskeT88.js","/Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/src/components/PreJoin.astro?astro&type=script&index=0&lang.ts":"_astro/PreJoin.astro_astro_type_script_index_0_lang.ChJrRdLb.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[["/Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/src/pages/index.astro?astro&type=script&index=0&lang.ts","function r(){const n=[\"quick\",\"happy\",\"clever\",\"brave\",\"calm\",\"eager\",\"kind\",\"proud\",\"smart\",\"witty\",\"jolly\",\"lively\",\"mighty\",\"noble\",\"sunny\"],t=[\"fox\",\"bear\",\"wolf\",\"eagle\",\"tiger\",\"lion\",\"deer\",\"hawk\",\"dolphin\",\"koala\",\"panda\",\"otter\",\"rabbit\",\"turtle\",\"zebra\"],o=Math.floor(1e3+Math.random()*9e3),e=n[Math.floor(Math.random()*n.length)],a=t[Math.floor(Math.random()*t.length)];return`${e}-${a}-${o}`}document.addEventListener(\"DOMContentLoaded\",()=>{const n=document.getElementById(\"start-meeting\");n&&n.addEventListener(\"click\",()=>{const e=r();window.location.href=`/room/${e}`});const t=document.getElementById(\"join-meeting\"),o=document.getElementById(\"join-room\");t&&o&&(t.addEventListener(\"click\",()=>{const e=o.value.trim();e?window.location.href=`/room/${e}`:alert(\"Please enter a room code\")}),o.addEventListener(\"keypress\",e=>{e.key===\"Enter\"&&t.click()}))});"]],"assets":["/_astro/index.Cqw9el9J.css","/index5.html","/_astro/PreJoin.astro_astro_type_script_index_0_lang.ChJrRdLb.js","/_astro/VideoConference.astro_astro_type_script_index_0_lang.DE3OY0YB.js","/_astro/VideoConference.astro_astro_type_script_index_1_lang.CBskeT88.js","/_astro/VideoConference.astro_astro_type_script_index_2_lang.BJZfoa6Q.js"],"buildFormat":"directory","checkOrigin":true,"serverIslandNameMap":[],"key":"rItPIG6wziZ5LnvwxhNXC8pQUbbfi7f8o7+uoXwyNC0="});
if (manifest.sessionConfig) manifest.sessionConfig.driverModule = null;

export { manifest };
