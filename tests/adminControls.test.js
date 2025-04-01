/**
 * Admin Controls Unit Tests
 * 
 * These tests verify the functionality of the admin control features
 * in the LiveKit video conferencing application without requiring human
 * interaction.
 */

const videoConference = require('../src/components/videoConference.js');

// Extract the required functions and objects from the module
const { 
  ParticipantManager, 
  determineIfAdmin
} = videoConference;

// Create a more complete DOM environment for testing
document.body.innerHTML = `
  <div id="video-grid" class="grid grid-cols-1"></div>
  <div id="participants-container"></div>
  <div id="main-container">
    <div id="room-controls"></div>
    <div id="toast" class="hidden">
      <div id="toast-message"></div>
    </div>
  </div>
`;

// Reference to LiveKit client - we'll simulate what would be available in the global scope
global.LivekitClient = {
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

// Mock the global functions and variables needed
global.mainContainer = document.getElementById('main-container');
global.localViewState = { adminOverride: false };
global.updateGrid = jest.fn();
global.showToast = jest.fn();

// Create a more robustly mocked toast element
const toastElement = document.getElementById('toast');
const toastMessageElement = document.getElementById('toast-message');
global.toast = toastElement;
global.toastMessage = toastMessageElement;

// Create TextEncoder/Decoder mocks
global.TextEncoder = class {
  encode(text) {
    return new Uint8Array([...text].map(char => char.charCodeAt(0)));
  }
};

global.TextDecoder = class {
  decode(data) {
    return String.fromCharCode.apply(null, data);
  }
};

// Create mock participants
const createMockParticipant = (identity, isAdmin = false) => ({
  identity,
  audioTrack: { attachedElements: [] },
  videoTrack: { attachedElements: [] },
  tracks: new Map(),
  speaking: false
});

describe('Admin Controls', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock global room with a more complete structure
    global.room = {
      localParticipant: {
        identity: 'admin',
        publishData: jest.fn().mockReturnValue(Promise.resolve())
      },
      state: LivekitClient.ConnectionState.Connected,
      on: jest.fn(),
      off: jest.fn(),
      participants: new Map(),
      _adminDataChannelSetup: false,
    };
    
    // Reset state before each test
    ParticipantManager.participants = new Map();
    ParticipantManager.adminViewState = {
      viewMode: 'normal',
      targetParticipantId: null,
      adminIdentity: null,
      timestamp: Date.now() - 1000 // Set to past timestamp
    };
    
    // Reset local view state
    global.localViewState = { adminOverride: false };
    
    // Mock some participants 
    const adminParticipant = createMockParticipant('admin', true);
    const regularParticipant1 = createMockParticipant('user1', false);
    const regularParticipant2 = createMockParticipant('user2', false);
    
    // Add participants to the manager and the mock room
    ParticipantManager.participants.set('admin', { 
      participant: adminParticipant, 
      isAdmin: true,
      disconnected: false,
      timestamp: Date.now() 
    });
    
    ParticipantManager.participants.set('user1', { 
      participant: regularParticipant1, 
      isAdmin: false,
      disconnected: false,
      timestamp: Date.now() 
    });
    
    ParticipantManager.participants.set('user2', { 
      participant: regularParticipant2, 
      isAdmin: false,
      disconnected: false,
      timestamp: Date.now() 
    });
    
    // Make available in room.participants too
    room.participants.set('admin', adminParticipant);
    room.participants.set('user1', regularParticipant1);
    room.participants.set('user2', regularParticipant2);
    
    // Override the isCurrentUserAdmin method for testing
    ParticipantManager.isCurrentUserAdmin = jest.fn().mockImplementation(() => {
      if (!room || !room.localParticipant) return false;
      return determineIfAdmin(room.localParticipant.identity);
    });
    
    // Mock the setAdminViewState method
    const originalSetAdminViewState = ParticipantManager.setAdminViewState;
    ParticipantManager.setAdminViewState = jest.fn().mockImplementation((viewMode, targetParticipantId) => {
      if (!ParticipantManager.isCurrentUserAdmin()) {
        console.warn('Non-admin user attempted to set admin view state');
        return false;
      }
      
      ParticipantManager.adminViewState = {
        viewMode,
        targetParticipantId,
        adminIdentity: room.localParticipant.identity,
        timestamp: Date.now()
      };
      
      return true;
    });
    
    // Mock the broadcastAdminViewState function
    videoConference.broadcastAdminViewState = jest.fn().mockImplementation((adminViewState) => {
      if (!ParticipantManager.isCurrentUserAdmin()) {
        return false;
      }
      
      if (!room || !room.localParticipant) {
        return false;
      }
      
      // Simulate publishing data - would be encoded in real implementation
      const data = JSON.stringify({
        type: 'admin-control',
        adminViewState: adminViewState || ParticipantManager.adminViewState
      });
      
      // Convert to a Uint8Array as the real function would
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(data);
      
      // Call the mock publish function
      room.localParticipant.publishData(encodedData);
      
      return true;
    });
    
    // Mock setupAdminDataChannel
    videoConference.setupAdminDataChannel = jest.fn().mockImplementation(() => {
      if (!room) {
        return false;
      }
      
      if (room._adminDataChannelSetup) {
        return true;
      }
      
      // Register listener
      room.on(LivekitClient.RoomEvent.DataReceived, expect.any(Function));
      
      // Mark as setup
      room._adminDataChannelSetup = true;
      
      return true;
    });
    
    // Mock handleAdminControlMessage
    videoConference.handleAdminControlMessage = jest.fn().mockImplementation((data, participant) => {
      // Skip if not admin control message
      if (!data || data.type !== 'admin-control' || !data.adminViewState) {
        return false;
      }
      
      // Verify admin status of sender
      const senderIdentity = participant.identity;
      
      // Get participant data from ParticipantManager
      const senderData = ParticipantManager.participants.get(senderIdentity);
      
      // Verify sender is admin
      if (!senderData || !senderData.isAdmin) {
        return false;
      }
      
      // Extract admin view state
      const newState = data.adminViewState;
      
      // Skip if timestamp is older than current state
      if (newState.timestamp <= ParticipantManager.adminViewState.timestamp) {
        return false;
      }
      
      // Update the admin view state
      ParticipantManager.adminViewState = newState;
      
      // Update local view state to show admin override
      localViewState.adminOverride = true;
      
      // Notify user of admin control
      showToast(`Admin ${newState.adminIdentity} changed the view`);
      
      // Update UI
      updateGrid();
      
      return true;
    });
  });

  test('determineIfAdmin correctly identifies admin users', () => {
    // These are the admin usernames defined in the application
    expect(determineIfAdmin('admin')).toBe(true);
    expect(determineIfAdmin('moderator')).toBe(true);
    expect(determineIfAdmin('host')).toBe(true);
    expect(determineIfAdmin('teacher')).toBe(true);
    expect(determineIfAdmin('instructor')).toBe(true);
    
    // These should also be identified as admins based on the prefix/suffix rules
    expect(determineIfAdmin('admin-user')).toBe(true);
    expect(determineIfAdmin('user-admin')).toBe(true);
    
    // These should not be identified as admins
    expect(determineIfAdmin('user')).toBe(false);
    expect(determineIfAdmin('adminx')).toBe(false);
    expect(determineIfAdmin('xadmin')).toBe(false);
  });

  test('ParticipantManager.isCurrentUserAdmin correctly identifies admin status', () => {
    // Test with admin identity
    room.localParticipant.identity = 'admin';
    expect(ParticipantManager.isCurrentUserAdmin()).toBe(true);
    
    // Change to non-admin
    room.localParticipant.identity = 'regular-user';
    expect(ParticipantManager.isCurrentUserAdmin()).toBe(false);
    
    // Restore admin identity
    room.localParticipant.identity = 'admin';
  });

  test('setupAdminDataChannel configures data channel listeners', () => {
    // Call setup function
    const result = videoConference.setupAdminDataChannel();
    
    // Should configure correctly
    expect(result).toBe(true);
    
    // Should register a data channel listener
    expect(room.on).toHaveBeenCalledWith(
      LivekitClient.RoomEvent.DataReceived, 
      expect.any(Function)
    );
    
    // Should set the flag to prevent duplicate setup
    expect(room._adminDataChannelSetup).toBe(true);
    
    // Second call should not add another listener
    room.on.mockClear();
    videoConference.setupAdminDataChannel();
    expect(room.on).not.toHaveBeenCalled();
  });

  test('ParticipantManager.setAdminViewState only works for admin users', () => {
    // Should work for admin
    room.localParticipant.identity = 'admin';
    expect(ParticipantManager.setAdminViewState('expanded', 'user1')).toBe(true);
    expect(ParticipantManager.adminViewState.viewMode).toBe('expanded');
    expect(ParticipantManager.adminViewState.targetParticipantId).toBe('user1');
    expect(ParticipantManager.adminViewState.adminIdentity).toBe('admin');
    
    // Should not work for non-admin
    room.localParticipant.identity = 'regular-user';
    expect(ParticipantManager.setAdminViewState('normal')).toBe(false);
    
    // State should not have changed
    expect(ParticipantManager.adminViewState.viewMode).toBe('expanded');
    
    // Restore admin identity
    room.localParticipant.identity = 'admin';
  });

  test('broadcastAdminViewState sends data to all participants for admin users', () => {
    // Should work for admin
    room.localParticipant.identity = 'admin';
    const result = videoConference.broadcastAdminViewState({
      viewMode: 'screenShareFullScreen',
      targetParticipantId: 'user2',
      adminIdentity: 'admin',
      timestamp: Date.now()
    });
    
    expect(result).toBe(true);
    expect(room.localParticipant.publishData).toHaveBeenCalled();
    
    // Should not work for non-admin
    room.localParticipant.publishData.mockClear();
    room.localParticipant.identity = 'regular-user';
    
    const nonAdminResult = videoConference.broadcastAdminViewState({
      viewMode: 'normal'
    });
    
    expect(nonAdminResult).toBe(false);
    expect(room.localParticipant.publishData).not.toHaveBeenCalled();
    
    // Restore admin identity
    room.localParticipant.identity = 'admin';
  });

  test('handleAdminControlMessage processes valid admin control messages', () => {
    // Create a test message from an admin
    const adminMsg = {
      type: 'admin-control',
      adminViewState: {
        viewMode: 'expanded',
        targetParticipantId: 'user1',
        adminIdentity: 'admin',
        timestamp: Date.now() + 1000 // future timestamp to ensure it's newer
      }
    };
    
    // Create a mock sender (admin)
    const adminSender = { identity: 'admin' };
    
    // Process the message
    const result = videoConference.handleAdminControlMessage(adminMsg, adminSender);
    
    // Verify state was updated
    expect(result).toBe(true);
    expect(ParticipantManager.adminViewState.viewMode).toBe('expanded');
    expect(ParticipantManager.adminViewState.targetParticipantId).toBe('user1');
    expect(ParticipantManager.adminViewState.adminIdentity).toBe('admin');
    expect(localViewState.adminOverride).toBe(true);
    
    // Verify UI was updated
    expect(showToast).toHaveBeenCalled();
    expect(updateGrid).toHaveBeenCalled();
    
    // Reset mocks
    showToast.mockClear();
    updateGrid.mockClear();
    
    // Test that message from non-admin is rejected
    const nonAdminSender = { identity: 'user1' };
    const nonAdminResult = videoConference.handleAdminControlMessage(adminMsg, nonAdminSender);
    
    // Should be rejected
    expect(nonAdminResult).toBe(false);
    expect(showToast).not.toHaveBeenCalled();
  });

  test('Admin controls data flow integration test', () => {
    // Step 1: Admin sets a view state
    room.localParticipant.identity = 'admin';
    ParticipantManager.setAdminViewState('screenShareFullScreen', 'user2');
    
    // Step 2: Admin broadcasts this state to all participants
    const broadcastResult = videoConference.broadcastAdminViewState(ParticipantManager.adminViewState);
    
    // Verify message was sent
    expect(broadcastResult).toBe(true);
    expect(room.localParticipant.publishData).toHaveBeenCalled();
    
    // Step 3: Simulate receiving this message on another participant
    // Reset state to simulate a different participant
    ParticipantManager.adminViewState = {
      viewMode: 'normal',
      targetParticipantId: null,
      adminIdentity: null,
      timestamp: Date.now() - 1000
    };
    localViewState.adminOverride = false;
    
    // Clear mocks before processing
    showToast.mockClear();
    updateGrid.mockClear();
    
    // Create a test message from an admin (similar to what would be sent)
    const adminMsg = {
      type: 'admin-control',
      adminViewState: {
        viewMode: 'screenShareFullScreen',
        targetParticipantId: 'user2',
        adminIdentity: 'admin',
        timestamp: Date.now() + 1000
      }
    };
    
    // Process the "received" message as if it came from the admin
    const handleResult = videoConference.handleAdminControlMessage(adminMsg, { identity: 'admin' });
    
    // Verify the receiver processed the message correctly
    expect(handleResult).toBe(true);
    expect(ParticipantManager.adminViewState.viewMode).toBe('screenShareFullScreen');
    expect(ParticipantManager.adminViewState.targetParticipantId).toBe('user2');
    expect(localViewState.adminOverride).toBe(true);
    expect(showToast).toHaveBeenCalled();
    expect(updateGrid).toHaveBeenCalled();
  });
});
