// Import testing library extensions
require('@testing-library/jest-dom');

// Mock the LiveKit client
jest.mock('livekit-client', () => {
  return {
    Room: jest.fn().mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(true),
      disconnect: jest.fn().mockResolvedValue(true),
      on: jest.fn(),
      off: jest.fn(),
      localParticipant: {
        identity: 'test-local-user',
        publishData: jest.fn(),
        enableCameraAndMicrophone: jest.fn().mockResolvedValue(true)
      },
      state: 'connected',
      participants: new Map()
    })),
    RoomEvent: {
      ParticipantConnected: 'participantConnected',
      ParticipantDisconnected: 'participantDisconnected',
      TrackSubscribed: 'trackSubscribed',
      TrackUnsubscribed: 'trackUnsubscribed',
      DataReceived: 'dataReceived',
      ConnectionStateChanged: 'connectionStateChanged'
    },
    ConnectionState: {
      Connected: 'connected',
      Disconnected: 'disconnected'
    },
    Track: {
      Source: {
        Camera: 'camera',
        Microphone: 'microphone',
        ScreenShare: 'screen_share'
      }
    },
    DataPacket_Kind: {
      RELIABLE: 'reliable'
    }
  };
});

// Mock browser APIs that aren't available in JSDOM
window.HTMLMediaElement.prototype.play = jest.fn();
window.HTMLMediaElement.prototype.pause = jest.fn();

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [
        { kind: 'audio', enabled: true },
        { kind: 'video', enabled: true }
      ]
    }),
    enumerateDevices: jest.fn().mockResolvedValue([
      { kind: 'audioinput', deviceId: 'audio-1', label: 'Test Microphone' },
      { kind: 'videoinput', deviceId: 'video-1', label: 'Test Camera' }
    ])
  },
  writable: true
});
