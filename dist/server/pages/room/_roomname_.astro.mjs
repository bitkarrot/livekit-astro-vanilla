/* empty css                                    */
import { e as createComponent, f as createAstro, m as maybeRenderHead, h as addAttribute, i as renderScript, r as renderTemplate, j as defineScriptVars, k as renderComponent } from '../../chunks/astro/server_tN532GVR.mjs';
import { $ as $$Layout } from '../../chunks/Layout_C5ur_d2Y.mjs';
/* empty css                                         */
export { renderers } from '../../renderers.mjs';

const $$Astro$2 = createAstro();
const $$PreJoin = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$PreJoin;
  const { roomName } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<div id="connect-modal" class="fixed inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center"> <div class="bg-gray-900 p-6 rounded-lg max-w-md w-full"> <h2 class="text-white text-xl font-bold mb-4">Join Meeting</h2> <div id="permissions-warning" class="hidden mb-4 p-3 bg-yellow-600 text-white rounded">
Please allow camera and microphone access to join the meeting
</div> <!-- Video preview --> <div class="video-preview" id="video-preview"> <!-- Video element will be inserted here by JS --> <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path> </svg> </div> <!-- Device selection --> <div class="flex gap-2 mb-2"> <div class="device-control flex-1"> <div class="device-button-group"> <button id="microphone-toggle" class="device-toggle"> <div class="icon-container"> <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path> </svg> <svg class="w-5 h-5 slash-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6L6 18"></path> </svg> </div> <span>Microphone</span> </button> <button id="microphone-dropdown-button" class="device-dropdown-button"> <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path> </svg> </button> </div> <div id="microphone-dropdown" class="device-dropdown hidden"> <!-- Microphone options will be inserted here by JS --> </div> </div> <div class="device-control flex-1"> <div class="device-button-group"> <button id="camera-toggle" class="device-toggle"> <div class="icon-container"> <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path> </svg> <svg class="w-5 h-5 slash-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6L6 18"></path> </svg> </div> <span>Camera</span> </button> <button id="camera-dropdown-button" class="device-dropdown-button"> <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path> </svg> </button> </div> <div id="camera-dropdown" class="device-dropdown hidden"> <!-- Camera options will be inserted here by JS --> </div> </div> </div> <div class="mb-4"> <!-- enter your name --> <input id="username" type="text" class="w-full p-2 rounded bg-gray-700 text-white" placeholder="Enter your name"> </div> <!-- Hidden room input for compatibility with existing JS --> <input id="room" type="hidden" class="hidden"${addAttribute(roomName, "value")}> <button id="join-btn" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
Join Room
</button> </div> </div> ${renderScript($$result, "/Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/src/components/PreJoin.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/src/components/PreJoin.astro", void 0);

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Astro$1 = createAstro();
const $$VideoConference = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$VideoConference;
  const { roomName } = Astro2.props;
  return renderTemplate(_a || (_a = __template(["<!-- Connection status banner -->", '<div id="status-banner" class="bg-blue-600 text-white text-center py-2 hidden"> <span id="status-text">Connecting...</span> </div> <!-- Main video container --> <div id="mainContainer" class="flex-1 overflow-y-auto p-2 relative"> <div id="videoGrid" class="grid gap-2 grid-cols-2 h-full"> <!-- Participant tiles will be dynamically added here --> </div> </div> <!-- Control bar --> <div class="bg-gray-800 p-3 flex justify-center items-center gap-4"> <!-- Settings button - NEW --> <button id="settings-btn" class="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center" aria-label="Settings"> <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path> </svg> </button> <button id="mic-btn" class="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center" aria-label="Toggle microphone"> <svg id="mic-icon" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path> </svg> <svg id="mic-off-icon" class="w-6 h-6 text-white hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18"></path> </svg> </button> <button id="camera-btn" class="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center" aria-label="Toggle camera"> <svg id="camera-icon" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path> </svg> <svg id="camera-off-icon" class="w-6 h-6 text-white hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18"></path> </svg> </button> <button id="screen-btn" class="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center" aria-label="Share screen"> <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path> </svg> </button> <button id="invite-btn" class="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center" aria-label="Copy invite link"> <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path> </svg> </button> <button id="leave-btn" class="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center" aria-label="Leave meeting"> <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path> </svg> </button> </div> <!-- Settings popup --> <div id="settings-popup" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden"> <div class="bg-gray-900 text-white rounded-lg max-w-md w-full mx-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 overflow-hidden"> <!-- Tabs --> <div class="flex border-b border-gray-700"> <button id="media-devices-tab" class="py-4 px-5 text-lg font-medium border-b-2 border-blue-500 flex-1 text-left">Media Devices</button> <button id="effects-tab" class="py-4 px-5 text-lg font-medium border-b-2 border-transparent flex-1 text-left text-gray-400 hover:text-white">Effects</button> </div> <!-- Media Devices Tab Content --> <div id="media-devices-content" class="p-5 space-y-8"> <!-- Camera Section --> <div> <h3 class="text-xl mb-4">Camera</h3> <div class="bg-gray-800 rounded-md p-3"> <select id="video-input" class="w-full bg-transparent text-white text-lg py-2 focus:outline-none appearance-none cursor-pointer"> <option value="">Loading...</option> </select> <div class="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none"> <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path> </svg> </div> </div> </div> <!-- Microphone Section --> <div> <h3 class="text-xl mb-4">Microphone Selection</h3> <div class="bg-gray-800 rounded-md p-3"> <select id="audio-input" class="w-full bg-transparent text-white text-lg py-2 focus:outline-none appearance-none cursor-pointer"> <option value="">Loading...</option> </select> <!-- <div class="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">\n            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">\n              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>\n            </svg>\n          </div> --> </div> </div> <!-- Speaker & Headphones Section --> <div> <h3 class="text-xl mb-4">Speaker & Headphones</h3> <div class="bg-gray-800 rounded-md p-3"> <select id="audio-output" class="w-full bg-transparent text-white text-lg py-2 focus:outline-none appearance-none cursor-pointer"> <option value="">Default</option> </select> <!-- <div class="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">\n             <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">\n              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>\n            </svg>\n          </div> --> </div> </div> </div> <!-- Effects Tab Content (Hidden by default) --> <div id="effects-content" class="p-5 hidden"> <p class="text-gray-400">No effects available at this time.</p> </div> <!-- Footer --> <div class="flex justify-end p-4 border-t border-gray-700"> <button id="close-settings" class="px-6 py-2 text-lg bg-gray-700 hover:bg-gray-600 rounded-md">\nClose\n</button> </div> </div> </div> <!-- PreJoin component (connect modal) --> ', ' <!-- Toast notifications --> <div id="toast" class="fixed top-14 right-2 hidden"> <div class="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 shadow-lg"> <span id="toast-message"></span> </div> </div> ', " <script>(function(){", "\n  // Pass the roomName to the JavaScript\n  window.roomNameFromPath = roomName;\n  // Update page title with room name\n  document.title = `Meeting: ${roomName}`;\n})();<\/script> ", " ", ""], ["<!-- Connection status banner -->", '<div id="status-banner" class="bg-blue-600 text-white text-center py-2 hidden"> <span id="status-text">Connecting...</span> </div> <!-- Main video container --> <div id="mainContainer" class="flex-1 overflow-y-auto p-2 relative"> <div id="videoGrid" class="grid gap-2 grid-cols-2 h-full"> <!-- Participant tiles will be dynamically added here --> </div> </div> <!-- Control bar --> <div class="bg-gray-800 p-3 flex justify-center items-center gap-4"> <!-- Settings button - NEW --> <button id="settings-btn" class="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center" aria-label="Settings"> <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path> </svg> </button> <button id="mic-btn" class="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center" aria-label="Toggle microphone"> <svg id="mic-icon" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path> </svg> <svg id="mic-off-icon" class="w-6 h-6 text-white hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18"></path> </svg> </button> <button id="camera-btn" class="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center" aria-label="Toggle camera"> <svg id="camera-icon" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path> </svg> <svg id="camera-off-icon" class="w-6 h-6 text-white hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18"></path> </svg> </button> <button id="screen-btn" class="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center" aria-label="Share screen"> <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path> </svg> </button> <button id="invite-btn" class="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center" aria-label="Copy invite link"> <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path> </svg> </button> <button id="leave-btn" class="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center" aria-label="Leave meeting"> <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path> </svg> </button> </div> <!-- Settings popup --> <div id="settings-popup" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden"> <div class="bg-gray-900 text-white rounded-lg max-w-md w-full mx-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 overflow-hidden"> <!-- Tabs --> <div class="flex border-b border-gray-700"> <button id="media-devices-tab" class="py-4 px-5 text-lg font-medium border-b-2 border-blue-500 flex-1 text-left">Media Devices</button> <button id="effects-tab" class="py-4 px-5 text-lg font-medium border-b-2 border-transparent flex-1 text-left text-gray-400 hover:text-white">Effects</button> </div> <!-- Media Devices Tab Content --> <div id="media-devices-content" class="p-5 space-y-8"> <!-- Camera Section --> <div> <h3 class="text-xl mb-4">Camera</h3> <div class="bg-gray-800 rounded-md p-3"> <select id="video-input" class="w-full bg-transparent text-white text-lg py-2 focus:outline-none appearance-none cursor-pointer"> <option value="">Loading...</option> </select> <div class="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none"> <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path> </svg> </div> </div> </div> <!-- Microphone Section --> <div> <h3 class="text-xl mb-4">Microphone Selection</h3> <div class="bg-gray-800 rounded-md p-3"> <select id="audio-input" class="w-full bg-transparent text-white text-lg py-2 focus:outline-none appearance-none cursor-pointer"> <option value="">Loading...</option> </select> <!-- <div class="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">\n            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">\n              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>\n            </svg>\n          </div> --> </div> </div> <!-- Speaker & Headphones Section --> <div> <h3 class="text-xl mb-4">Speaker & Headphones</h3> <div class="bg-gray-800 rounded-md p-3"> <select id="audio-output" class="w-full bg-transparent text-white text-lg py-2 focus:outline-none appearance-none cursor-pointer"> <option value="">Default</option> </select> <!-- <div class="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">\n             <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">\n              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>\n            </svg>\n          </div> --> </div> </div> </div> <!-- Effects Tab Content (Hidden by default) --> <div id="effects-content" class="p-5 hidden"> <p class="text-gray-400">No effects available at this time.</p> </div> <!-- Footer --> <div class="flex justify-end p-4 border-t border-gray-700"> <button id="close-settings" class="px-6 py-2 text-lg bg-gray-700 hover:bg-gray-600 rounded-md">\nClose\n</button> </div> </div> </div> <!-- PreJoin component (connect modal) --> ', ' <!-- Toast notifications --> <div id="toast" class="fixed top-14 right-2 hidden"> <div class="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 shadow-lg"> <span id="toast-message"></span> </div> </div> ', " <script>(function(){", "\n  // Pass the roomName to the JavaScript\n  window.roomNameFromPath = roomName;\n  // Update page title with room name\n  document.title = \\`Meeting: \\${roomName}\\`;\n})();<\/script> ", " ", ""])), maybeRenderHead(), renderComponent($$result, "PreJoin", $$PreJoin, { "roomName": roomName }), renderScript($$result, "/Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/src/components/VideoConference.astro?astro&type=script&index=0&lang.ts"), defineScriptVars({ roomName }), renderScript($$result, "/Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/src/components/VideoConference.astro?astro&type=script&index=1&lang.ts"), renderScript($$result, "/Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/src/components/VideoConference.astro?astro&type=script&index=2&lang.ts"));
}, "/Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/src/components/VideoConference.astro", void 0);

const $$Astro = createAstro();
const $$roomName = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$roomName;
  const { roomName } = Astro2.params;
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": `Hivetalk Video Conference - ${roomName}` }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "VideoConference", $$VideoConference, { "roomName": roomName })} ` })}`;
}, "/Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/src/pages/room/[roomName].astro", void 0);

const $$file = "/Users/bitcarrot/hivetalk/livekit/livekit-astro-vanilla/src/pages/room/[roomName].astro";
const $$url = "/room/[roomName]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$roomName,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
