import { AccessToken } from 'livekit-server-sdk';
import dotenv from 'dotenv';
export { renderers } from '../../renderers.mjs';

dotenv.config();
const GET = async ({ request }) => {
  const url = new URL(request.url);
  const roomName = url.searchParams.get("room");
  const participantName = url.searchParams.get("username");
  if (!roomName || !participantName) {
    return new Response(
      JSON.stringify({ error: "Room name and participant name are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const apiKey = "devkey";
  const apiSecret = "secret";
  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantName
  });
  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true
  });
  return new Response(
    JSON.stringify({
      token: token.toJwt(),
      url: "ws://127.0.0.1:7880"
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
