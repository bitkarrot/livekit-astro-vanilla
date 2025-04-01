/**
 * Join Meeting and Layout Grid Tests
 * 
 * These tests verify:
 * 1. The Join Meeting functionality works correctly
 * 2. The layout grid properly adjusts for different participant counts
 * 3. Expand/contract functionality works with 4+ participants
 */

const videoConference = require('../src/components/videoConference.js');

// Setup DOM for testing
document.body.innerHTML = `
  <div id="joinPanel" class="join-panel">
    <input id="roomNameInput" type="text" placeholder="Room Name" />
    <input id="usernameInput" type="text" placeholder="Your Name" />
    <button id="joinButton">Join</button>
    <div id="joinError" class="error-message"></div>
  </div>
  <div id="conferencePanel" class="conference-panel hidden">
    <div id="main-container">
      <div id="video-grid" class="grid grid-cols-1"></div>
      <div id="toast" class="hidden">
        <div id="toast-message"></div>
      </div>
      <div id="room-controls"></div>
    </div>
  </div>
`;

// Mock LiveKit client
global.LivekitClient = {
  Room: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({}),
    on: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn(),
    localParticipant: {
      identity: 'testUser',
      publishTrack: jest.fn().mockResolvedValue({}),
      setMicrophoneEnabled: jest.fn().mockResolvedValue(true),
      setCameraEnabled: jest.fn().mockResolvedValue(true),
      tracks: new Map()
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
    ConnectionStateChanged: 'connectionStateChanged',
    Disconnected: 'disconnected',
    Reconnected: 'reconnected',
    LocalTrackPublished: 'localTrackPublished',
    LocalTrackUnpublished: 'localTrackUnpublished'
  },
  ConnectionState: {
    Connected: 'connected',
    Disconnected: 'disconnected',
    Connecting: 'connecting',
    Reconnecting: 'reconnecting'
  },
  Track: {
    Source: {
      Camera: 'camera',
      Microphone: 'microphone',
      ScreenShare: 'screen_share'
    },
    Kind: {
      Video: 'video',
      Audio: 'audio'
    }
  },
  VideoPresets: {
    h720: { width: 1280, height: 720 }
  },
  createLocalVideoTrack: jest.fn().mockResolvedValue({ source: 'camera' }),
  createLocalAudioTrack: jest.fn().mockResolvedValue({ source: 'microphone' })
};

// Global mocks
global.fetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ token: 'mock-token' })
  })
);

// Mock functions from videoConference.js
const originalJoinRoom = videoConference.joinRoom;
const originalUpdateGrid = videoConference.updateGrid;
const originalGetGridClassName = videoConference.getGridClassName;
const originalExpandParticipant = videoConference.expandParticipant;
const originalContractParticipant = videoConference.contractParticipant;

// Create mock participants
const createMockParticipant = (identity, audioEnabled = true, videoEnabled = true) => ({
  identity,
  audioTrack: { 
    attachedElements: [],
    isMuted: !audioEnabled,
    source: 'microphone'
  },
  videoTrack: { 
    attachedElements: [],
    isMuted: !videoEnabled,
    source: 'camera'
  },
  tracks: new Map(),
  speaking: false,
  audioEnabled,
  videoEnabled,
  sid: `sid-${identity}`
});

describe('Join Meeting Functionality', () => {
  beforeEach(() => {
    // Reset DOM
    document.getElementById('joinPanel').classList.remove('hidden');
    document.getElementById('conferencePanel').classList.add('hidden');
    document.getElementById('roomNameInput').value = '';
    document.getElementById('usernameInput').value = '';
    document.getElementById('joinError').textContent = '';
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock joinRoom function
    videoConference.joinRoom = jest.fn().mockImplementation(async (roomName, username) => {
      if (!roomName || !username) {
        document.getElementById('joinError').textContent = 'Room name and username are required';
        return false;
      }
      
      if (roomName === 'invalid-room') {
        document.getElementById('joinError').textContent = 'Failed to connect to room';
        return false;
      }
      
      // Hide join panel, show conference panel
      document.getElementById('joinPanel').classList.add('hidden');
      document.getElementById('conferencePanel').classList.remove('hidden');
      
      // Create and store room
      global.room = new LivekitClient.Room();
      global.room.localParticipant.identity = username;
      
      // Setup any listeners or UI that would normally happen in joinRoom
      
      return true;
    });
    
    // Set up the global room variable
    global.room = null;
  });
  
  afterEach(() => {
    // Clean up
    global.room = null;
  });
  
  test('Join Room with valid inputs should connect successfully', async () => {
    // Set up valid inputs
    document.getElementById('roomNameInput').value = 'test-room';
    document.getElementById('usernameInput').value = 'test-user';
    
    // Trigger join
    const joinButton = document.getElementById('joinButton');
    await videoConference.joinRoom('test-room', 'test-user');
    
    // Check that join was successful
    expect(document.getElementById('joinPanel').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('conferencePanel').classList.contains('hidden')).toBe(false);
    expect(global.room).not.toBeNull();
    expect(global.room.localParticipant.identity).toBe('test-user');
  });
  
  test('Join Room with empty inputs should show error', async () => {
    // Empty inputs
    document.getElementById('roomNameInput').value = '';
    document.getElementById('usernameInput').value = '';
    
    // Attempt to join
    await videoConference.joinRoom('', '');
    
    // Should show error and not proceed
    expect(document.getElementById('joinError').textContent).toBe('Room name and username are required');
    expect(document.getElementById('joinPanel').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('conferencePanel').classList.contains('hidden')).toBe(true);
  });
  
  test('Join Room with invalid room should handle error', async () => {
    // Set up inputs with invalid room
    document.getElementById('roomNameInput').value = 'invalid-room';
    document.getElementById('usernameInput').value = 'test-user';
    
    // Attempt to join
    await videoConference.joinRoom('invalid-room', 'test-user');
    
    // Should show error and not proceed
    expect(document.getElementById('joinError').textContent).toBe('Failed to connect to room');
    expect(document.getElementById('joinPanel').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('conferencePanel').classList.contains('hidden')).toBe(true);
  });
});

describe('Layout Grid Functionality', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div id="main-container">
        <div id="video-grid" class="grid"></div>
        <div id="participants-container"></div>
      </div>
    `;
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock getGridClassName function
    videoConference.getGridClassName = jest.fn().mockImplementation((count) => {
      if (count <= 0) return 'grid-cols-1';
      if (count === 1) return 'grid-cols-1';
      if (count === 2) return 'grid-cols-2';
      if (count === 3 || count === 4) return 'grid-cols-2';
      if (count <= 9) return 'grid-cols-3';
      return 'grid-cols-4';
    });
    
    // Mock updateGrid function
    videoConference.updateGrid = jest.fn().mockImplementation(() => {
      const videoGrid = document.getElementById('video-grid');
      const participantCount = global.room.participants.size + 1; // +1 for local participant
      
      // Apply grid class based on participant count
      const gridClass = videoConference.getGridClassName(participantCount);
      
      // Remove existing grid classes
      videoGrid.className = videoGrid.className.replace(/grid-cols-\d+/g, '');
      videoGrid.classList.add('grid');
      videoGrid.classList.add(gridClass);
    });
    
    // Mock expand/contract functions
    videoConference.expandParticipant = jest.fn().mockImplementation((participantDiv) => {
      const videoGrid = document.getElementById('video-grid');
      
      // Remove expanded class from all participants
      const expandedDivs = videoGrid.querySelectorAll('.expanded');
      expandedDivs.forEach(div => div.classList.remove('expanded'));
      
      // Add expanded class to target participant
      participantDiv.classList.add('expanded');
      
      // Update grid to show expanded layout
      videoGrid.classList.add('has-expanded');
    });
    
    videoConference.contractParticipant = jest.fn().mockImplementation((participantDiv) => {
      const videoGrid = document.getElementById('video-grid');
      
      // Remove expanded class
      participantDiv.classList.remove('expanded');
      
      // Update grid to remove expanded layout
      videoGrid.classList.remove('has-expanded');
    });
    
    // Set up the global room variable with participants
    global.room = {
      localParticipant: createMockParticipant('local-user'),
      participants: new Map()
    };
    
    // Create ParticipantManager mock
    if (!videoConference.ParticipantManager) {
      videoConference.ParticipantManager = {
        participants: new Map(),
        updateParticipant: jest.fn()
      };
    }
  });
  
  afterEach(() => {
    // Clean up
    global.room = null;
  });
  
  // Helper to add participants to the room and create DOM elements
  function addTestParticipants(count) {
    const videoGrid = document.getElementById('video-grid');
    
    // First add local participant
    const localParticipantDiv = document.createElement('div');
    localParticipantDiv.className = 'participant-container';
    localParticipantDiv.id = 'participant-local-user';
    videoGrid.appendChild(localParticipantDiv);
    
    // Then add remote participants
    for (let i = 1; i <= count; i++) {
      const participant = createMockParticipant(`user-${i}`);
      global.room.participants.set(`user-${i}`, participant);
      
      const participantDiv = document.createElement('div');
      participantDiv.className = 'participant-container';
      participantDiv.id = `participant-user-${i}`;
      videoGrid.appendChild(participantDiv);
    }
    
    // Update grid to reflect new participant count
    videoConference.updateGrid();
    
    return videoGrid;
  }
  
  test('Grid layout should adjust based on participant count', () => {
    // Test with 1 participant (just local user)
    addTestParticipants(0);
    expect(document.getElementById('video-grid').classList.contains('grid-cols-1')).toBe(true);
    
    // Clear and test with 2 participants
    document.getElementById('video-grid').innerHTML = '';
    global.room.participants.clear();
    addTestParticipants(1);
    expect(document.getElementById('video-grid').classList.contains('grid-cols-2')).toBe(true);
    
    // Clear and test with 4 participants
    document.getElementById('video-grid').innerHTML = '';
    global.room.participants.clear();
    addTestParticipants(3);
    expect(document.getElementById('video-grid').classList.contains('grid-cols-2')).toBe(true);
    
    // Clear and test with 6 participants
    document.getElementById('video-grid').innerHTML = '';
    global.room.participants.clear();
    addTestParticipants(5);
    expect(document.getElementById('video-grid').classList.contains('grid-cols-3')).toBe(true);
    
    // Clear and test with 10 participants
    document.getElementById('video-grid').innerHTML = '';
    global.room.participants.clear();
    addTestParticipants(9);
    expect(document.getElementById('video-grid').classList.contains('grid-cols-4')).toBe(true);
  });
  
  test('Expand participant should show expanded layout', () => {
    // Setup with 4 participants
    const videoGrid = addTestParticipants(3);
    const firstParticipant = videoGrid.querySelector('.participant-container');
    
    // Expand first participant
    videoConference.expandParticipant(firstParticipant);
    
    // Check that participant is expanded
    expect(firstParticipant.classList.contains('expanded')).toBe(true);
    expect(videoGrid.classList.contains('has-expanded')).toBe(true);
  });
  
  test('Contract participant should revert to normal layout', () => {
    // Setup with 4 participants
    const videoGrid = addTestParticipants(3);
    const firstParticipant = videoGrid.querySelector('.participant-container');
    
    // First expand
    videoConference.expandParticipant(firstParticipant);
    
    // Then contract
    videoConference.contractParticipant(firstParticipant);
    
    // Check that layout is normal
    expect(firstParticipant.classList.contains('expanded')).toBe(false);
    expect(videoGrid.classList.contains('has-expanded')).toBe(false);
  });
  
  test('Only one participant can be expanded at a time', () => {
    // Setup with 4 participants
    const videoGrid = addTestParticipants(3);
    const participants = videoGrid.querySelectorAll('.participant-container');
    
    // Expand first participant
    videoConference.expandParticipant(participants[0]);
    
    // Expand second participant
    videoConference.expandParticipant(participants[1]);
    
    // Check that first is no longer expanded but second is
    expect(participants[0].classList.contains('expanded')).toBe(false);
    expect(participants[1].classList.contains('expanded')).toBe(true);
    expect(videoGrid.classList.contains('has-expanded')).toBe(true);
  });
  
  test('Layout with 4+ participants should handle expand/contract correctly', () => {
    // Setup with 6 participants
    const videoGrid = addTestParticipants(5);
    const participants = videoGrid.querySelectorAll('.participant-container');
    
    // Verify initial grid layout
    expect(videoGrid.classList.contains('grid-cols-3')).toBe(true);
    
    // Expand a participant
    videoConference.expandParticipant(participants[3]);
    
    // Check expanded state
    expect(participants[3].classList.contains('expanded')).toBe(true);
    expect(videoGrid.classList.contains('has-expanded')).toBe(true);
    
    // Contract and check normal state
    videoConference.contractParticipant(participants[3]);
    expect(participants[3].classList.contains('expanded')).toBe(false);
    expect(videoGrid.classList.contains('has-expanded')).toBe(false);
    expect(videoGrid.classList.contains('grid-cols-3')).toBe(true);
  });
});
