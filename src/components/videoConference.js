// LiveKit configuration
let room;
let isReconnecting = false;

// DOM elements - wait for DOM to be fully loaded before accessing
let connectModal, permissionsWarning, joinBtn, usernameInput, roomInput;
let videoGrid, micBtn, cameraBtn, screenBtn, inviteBtn, leaveBtn, settingsBtn;
let micIcon, micOffIcon, cameraIcon, cameraOffIcon, statusBanner, statusText;
let audioInputSelect, videoInputSelect, audioOutputSelect, toast, toastMessage;
let settingsPopup, closeSettingsBtn, mediaDevicesTab, effectsTab, mediaDevicesContent, effectsContent;

// State
let micEnabled = false;
let cameraEnabled = false;
let screenShareTrack = null;
let currentRoom = '';
let audioAnalysers = new Map();
let roomEventsBound = false;
let participantRefreshInterval = null;
let activeScreenShareId = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', init);

async function init() {
  console.log('Initializing LiveKit app...');
  
  // Initialize DOM elements after DOM is loaded
  connectModal = document.getElementById('connect-modal');
  permissionsWarning = document.getElementById('permissions-warning');
  joinBtn = document.getElementById('join-btn');
  usernameInput = document.getElementById('username');
  roomInput = document.getElementById('room');
  videoGrid = document.getElementById('videoGrid');
  micBtn = document.getElementById('mic-btn');
  cameraBtn = document.getElementById('camera-btn');
  screenBtn = document.getElementById('screen-btn');
  inviteBtn = document.getElementById('invite-btn');
  leaveBtn = document.getElementById('leave-btn');
  settingsBtn = document.getElementById('settings-btn');
  micIcon = document.getElementById('mic-icon');
  micOffIcon = document.getElementById('mic-off-icon');
  cameraIcon = document.getElementById('camera-icon');
  cameraOffIcon = document.getElementById('camera-off-icon');
  statusBanner = document.getElementById('status-banner');
  statusText = document.getElementById('status-text');
  audioInputSelect = document.getElementById('audio-input');
  videoInputSelect = document.getElementById('video-input');
  audioOutputSelect = document.getElementById('audio-output');
  toast = document.getElementById('toast');
  toastMessage = document.getElementById('toast-message');
  settingsPopup = document.getElementById('settings-popup');
  closeSettingsBtn = document.getElementById('close-settings');
  mediaDevicesTab = document.getElementById('media-devices-tab');
  effectsTab = document.getElementById('effects-tab');
  mediaDevicesContent = document.getElementById('media-devices-content');
  effectsContent = document.getElementById('effects-content');
  
  try {
    // Verify LiveKit is available
    if (typeof LivekitClient === 'undefined') {
      throw new Error('LiveKit SDK not loaded. Please refresh the page and try again.');
    }
    
    console.log('LiveKit SDK version:', LivekitClient.version);
    
    // Create a new room instance
    room = new LivekitClient.Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: { width: 640, height: 480 }
      }, 
      publishDefaults: {
        simulcast: true
      },
      autoSubscribe: true
    });
    
    // Initialize the participants Map if it doesn't exist
    if (!room.participants) {
      console.log('Creating participants Map since it was undefined');
      room.participants = new Map();
    }
    
    // Populate device selection dropdowns
    await populateDeviceOptions();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check for direct join parameters in URL
    const urlParams = new URLSearchParams(window.location.search);
    const usernameParam = urlParams.get('username');
    const roomNameFromPath = window.roomNameFromPath;
    
    if (usernameParam && roomNameFromPath) {
      console.log('Direct join requested with username:', usernameParam);
      
      // Store username for future use
      localStorage.setItem('livekit-username', usernameParam);
      
      // Hide the connect modal immediately
      if (connectModal) {
        connectModal.style.display = 'none';
      }
      
      // Join directly with settings from localStorage or defaults
      try {
        // Get device preferences from localStorage
        const initialAudioEnabled = localStorage.getItem('livekit-audio-enabled') === 'false' ? false : true;
        const initialVideoEnabled = localStorage.getItem('livekit-video-enabled') === 'false' ? false : true;
        const selectedAudioDevice = localStorage.getItem('livekit-audio-device') || null;
        const selectedVideoDevice = localStorage.getItem('livekit-video-device') || null;
        
        // Set initial state based on localStorage preferences
        micEnabled = initialAudioEnabled;
        cameraEnabled = initialVideoEnabled;
        
        await joinRoom(usernameParam, roomNameFromPath, {
          audioDeviceId: selectedAudioDevice,
          videoDeviceId: selectedVideoDevice,
          audioEnabled: initialAudioEnabled,
          videoEnabled: initialVideoEnabled
        });
      } catch (error) {
        console.error('[ERROR] Error connecting to room directly:', error);
        showToast('Failed to connect: ' + (error.message || 'Unknown error'));
        
        // Show the connect modal if direct join fails
        if (connectModal) {
          connectModal.style.display = 'flex';
        }
        
        // Pre-fill the username field
        if (usernameInput) {
          usernameInput.value = usernameParam;
        }
      }
    } else if (roomNameFromPath) {
      console.log('Room name from path:', roomNameFromPath);
      roomInput.value = roomNameFromPath;
      
      // Fill in username if available, but don't auto-join
      const username = localStorage.getItem('livekit-username') || '';
      if (username) {
        usernameInput.value = username;
        // No auto-join - wait for user to click the join button
      }
    } else {
      // Fallback to query parameters for backward compatibility
      const roomParam = urlParams.get('room');
      if (roomParam) {
        roomInput.value = roomParam;
        
        // Fill in username if available, but don't auto-join
        const username = localStorage.getItem('livekit-username') || '';
        if (username) {
          usernameInput.value = username;
          // No auto-join - wait for user to click the join button
        }
      }
    }
    
    console.log('LiveKit app initialized successfully');
    
    // Remove any developer tools or debug elements that might be showing
    setTimeout(removeDebugElements, 500);
  } catch (error) {
    console.error('Failed to initialize app:', error);
    showToast('Failed to initialize: ' + error.message);
  }
}

// Remove any developer tools or debug elements
function removeDebugElements() {
  // Try to find and remove the "Send element" box
  const debugElements = document.querySelectorAll('div[id^="send-element"], div[id^="debug-"], div[id^="dev-"]');
  debugElements.forEach(el => {
    console.log('Removing debug element:', el);
    el.style.display = 'none';
  });
}

// Setup event listeners
function setupEventListeners() {
  // Join button
  joinBtn.addEventListener('click', async () => {
    // get values from prejoin
    const username = usernameInput.value.trim();
    const roomName = roomInput.value.trim() || window.roomNameFromPath;
    
    if (!username) {
      showToast('Please enter your name');
      return;
    }
    
    if (!roomName) {
      showToast('Room name is missing');
      return;
    }
    
    // Save username for future use
    localStorage.setItem('livekit-username', username);
    
    try {
      // Get device preferences from localStorage
      const initialAudioEnabled = localStorage.getItem('livekit-audio-enabled') === 'false' ? false : true;
      const initialVideoEnabled = localStorage.getItem('livekit-video-enabled') === 'false' ? false : true;
      const selectedAudioDevice = localStorage.getItem('livekit-audio-device') || null;
      const selectedVideoDevice = localStorage.getItem('livekit-video-device') || null;
      
      // Set initial state based on localStorage preferences
      micEnabled = initialAudioEnabled;
      cameraEnabled = initialVideoEnabled;
      
      await joinRoom(username, roomName, {
        audioDeviceId: selectedAudioDevice,
        videoDeviceId: selectedVideoDevice,
        audioEnabled: initialAudioEnabled,
        videoEnabled: initialVideoEnabled
      });
      
      // Check if we're already using path-based routing
      const isPathBasedRouting = window.roomNameFromPath !== undefined;
      
      if (!isPathBasedRouting) {
        // Redirect to the path-based URL
        window.location.href = `/room/${encodeURIComponent(roomName)}`;
      }
    } catch (error) {
      console.error('[ERROR] Error connecting to room:', error);
      showToast('Failed to connect: ' + (error.message || 'Unknown error'));
    }
  });
  
  // Mic toggle
  micBtn.addEventListener('click', async () => {
    try {
      if (!room || !room.localParticipant) {
        console.error('Cannot toggle microphone: Room or local participant not available');
        showToast('You must join a room before toggling your microphone');
        return;
      }
      
      try {
        if (micEnabled) {
          // Disable microphone
          await room.localParticipant.setMicrophoneEnabled(false);
          micEnabled = false;
          showToast('Microphone disabled');
        } else {
          // Enable microphone
          await room.localParticipant.setMicrophoneEnabled(true);
          micEnabled = true;
          showToast('Microphone enabled');
        }
        
        updateMicButton();
      } catch (deviceError) {
        console.error('[ERROR] Error toggling microphone:', deviceError);
        
        // Handle permission errors
        if (deviceError.name === 'NotAllowedError' || deviceError.message.includes('Permission denied')) {
          permissionsWarning.classList.remove('hidden');
          showToast('Microphone access denied. Please check your permissions.');
        } else {
          showToast('Failed to toggle microphone: ' + (deviceError.message || 'Unknown error'));
        }
        
        // Update button state to reflect reality
        micEnabled = !micEnabled;
        updateMicButton();
      }
    } catch (error) {
      console.error('[ERROR] Unexpected error toggling microphone:', error);
      showToast('An unexpected error occurred');
    }
  });
  
  // Camera toggle
  cameraBtn.addEventListener('click', async () => {
    try {
      if (!room || !room.localParticipant) {
        console.error('Cannot toggle camera: Room or local participant not available');
        showToast('You must join a room before toggling your camera');
        return;
      }
      
      try {
        if (cameraEnabled) {
          // Disable camera
          await room.localParticipant.setCameraEnabled(false);
          cameraEnabled = false;
          showToast('Camera disabled');
        } else {
          // Enable camera
          await room.localParticipant.setCameraEnabled(true);
          cameraEnabled = true;
          showToast('Camera enabled');
        }
        
        updateCameraButton();
      } catch (deviceError) {
        console.error('[ERROR] Error toggling camera:', deviceError);
        
        // Handle permission errors
        if (deviceError.name === 'NotAllowedError' || deviceError.message.includes('Permission denied')) {
          permissionsWarning.classList.remove('hidden');
          showToast('Camera access denied. Please check your permissions.');
        } else {
          showToast('Failed to toggle camera: ' + (deviceError.message || 'Unknown error'));
        }
        
        // Update button state to reflect reality
        cameraEnabled = !cameraEnabled;
        updateCameraButton();
      }
    } catch (error) {
      console.error('[ERROR] Unexpected error toggling camera:', error);
      showToast('An unexpected error occurred');
    }
  });
  
  // Screen share
  screenBtn.addEventListener('click', async () => {
    try {
      if (!room || !room.localParticipant) {
        console.error('Cannot toggle screen share: Room or local participant not available');
        showToast('You must join a room before sharing your screen');
        return;
      }
      
      if (screenShareTrack) {
        // Stop screen sharing
        await room.localParticipant.unpublishTrack(screenShareTrack);
        // Make sure to properly dispose the track to free up resources
        screenShareTrack.stop();
        screenShareTrack = null;
        screenBtn.classList.remove('bg-blue-600');
        screenBtn.classList.add('bg-gray-700');
        showToast('Screen sharing stopped');
        
        // Reset active screen share ID
        activeScreenShareId = null;
      } else {
        // Start screen sharing
        try {
          // Use a simpler approach with getDisplayMedia
          const constraints = {
            audio: true,
            video: true
          };
          
          console.log('Getting display media with constraints:', constraints);
          
          // Create screen capture stream
          const screenStream = await navigator.mediaDevices.getDisplayMedia(constraints);
          
          // Get video track
          const videoTrack = screenStream.getVideoTracks()[0];
          if (!videoTrack) {
            throw new Error('No video track found in screen share stream');
          }
          
          console.log('Created screen share video track:', videoTrack.id, videoTrack.label);
          
          // Create a LiveKit track from the media track
          // Use the simpler constructor to avoid issues with source identification
          screenShareTrack = new LivekitClient.LocalVideoTrack(videoTrack);
          
          console.log('Created LiveKit screen share track:', screenShareTrack);
          
          // Handle screen share ending
          videoTrack.addEventListener('ended', () => {
            console.log('Screen share track ended event fired');
            if (screenShareTrack) {
              room.localParticipant.unpublishTrack(screenShareTrack);
              screenShareTrack = null;
              screenBtn.classList.remove('bg-blue-600');
              screenBtn.classList.add('bg-gray-700');
              showToast('Screen sharing stopped');
              // Force update the participant grid
              updateParticipantGrid();
            }
          });
          
          // Publish the track with metadata to ensure it's recognized as screen share
          const publishOptions = {
            name: 'screen',
            source: LivekitClient.Track.Source.ScreenShare
          };
          
          await room.localParticipant.publishTrack(screenShareTrack, publishOptions);
          console.log('Published screen share track:', screenShareTrack.sid);
          
          screenBtn.classList.remove('bg-gray-700');
          screenBtn.classList.add('bg-blue-600');
          showToast('Screen sharing started');
          
          // Set this participant as the active screen share
          activeScreenShareId = room.localParticipant.identity;
          
          // Force update the participant grid
          updateParticipantGrid();
        } catch (screenError) {
          // Handle user cancellation (not a real error)
          if (screenError.name === 'NotAllowedError' || screenError.message.includes('Permission denied')) {
            console.log('User cancelled screen sharing');
            return;
          }
          
          console.error('[ERROR] Error toggling screen share:', screenError);
          showToast('Failed to share screen: ' + (screenError.message || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('[ERROR] Error toggling screen share:', error);
      showToast('An unexpected error occurred while sharing screen');
    }
  });
  
  // Invite link
  inviteBtn.addEventListener('click', () => {
    try {
      if (!currentRoom) {
        showToast('You must join a room first');
        return;
      }

      // Generate path-based invite link
      const inviteLink = `${window.location.origin}/room/${encodeURIComponent(currentRoom)}`;

      // Copy to clipboard
      navigator.clipboard.writeText(inviteLink)
        .then(() => {
          showToast('Invite link copied to clipboard');
        })
        .catch(error => {
          console.error('Failed to copy invite link:', error);
          showToast('Failed to copy invite link');
        });
    } catch (error) {
      console.error('Error generating invite link:', error);
      showToast('Error generating invite link');
    }
  });
  
  // Leave button
  leaveBtn.addEventListener('click', async () => {
    if (room) {
      await room.disconnect();
      connectModal.classList.remove('hidden');
      statusBanner.classList.add('hidden');
      videoGrid.innerHTML = '';
    }
  });
  
  // Device selection
  audioInputSelect.addEventListener('change', async () => {
    try {
      if (!room || !room.localParticipant) {
        console.log('Cannot change audio device: Not connected to a room');
        return;
      }
      
      const deviceId = audioInputSelect.value;
      if (!deviceId) return;
      
      await room.switchActiveDevice(LivekitClient.Track.Kind.Audio, deviceId);
      showToast('Microphone changed');
    } catch (error) {
      console.error('[ERROR] Failed to switch audio device:', error);
      showToast('Failed to change microphone: ' + (error.message || 'Unknown error'));
    }
  });
  
  videoInputSelect.addEventListener('change', async () => {
    try {
      if (!room || !room.localParticipant) {
        console.log('Cannot change video device: Not connected to a room');
        return;
      }
      
      const deviceId = videoInputSelect.value;
      if (!deviceId) return;
      
      await room.switchActiveDevice(LivekitClient.Track.Kind.Video, deviceId);
      showToast('Camera changed');
    } catch (error) {
      console.error('[ERROR] Failed to switch video device:', error);
      showToast('Failed to change camera: ' + (error.message || 'Unknown error'));
    }
  });
  
  // Settings button
  settingsBtn.addEventListener('click', () => {
    settingsPopup.classList.remove('hidden');
    
    // Refresh device lists when opening settings
    refreshInputDevices();
    refreshAudioOutputDevices();
  });

  // Close settings button
  closeSettingsBtn.addEventListener('click', () => {
    settingsPopup.classList.add('hidden');
  });

  // Close settings when clicking outside the settings box
  settingsPopup.addEventListener('click', (event) => {
    if (event.target === settingsPopup) {
      settingsPopup.classList.add('hidden');
    }
  });
  
  // Tab switching
  mediaDevicesTab.addEventListener('click', () => {
    // Activate media devices tab
    mediaDevicesTab.classList.add('border-blue-500');
    mediaDevicesTab.classList.remove('border-transparent', 'text-gray-400');
    mediaDevicesContent.classList.remove('hidden');
    
    // Deactivate effects tab
    effectsTab.classList.remove('border-blue-500');
    effectsTab.classList.add('border-transparent', 'text-gray-400');
    effectsContent.classList.add('hidden');
  });
  
  effectsTab.addEventListener('click', () => {
    // Activate effects tab
    effectsTab.classList.add('border-blue-500');
    effectsTab.classList.remove('border-transparent', 'text-gray-400');
    effectsContent.classList.remove('hidden');
    
    // Deactivate media devices tab
    mediaDevicesTab.classList.remove('border-blue-500');
    mediaDevicesTab.classList.add('border-transparent', 'text-gray-400');
    mediaDevicesContent.classList.add('hidden');
  });
  
  // Add event listener for audio output device change
  if (audioOutputSelect) {
    audioOutputSelect.addEventListener('change', handleAudioOutputChange);
  }
}

// Setup room events
function setupRoomEvents() {
  if (!room) return;
  
  // Remove any existing event listeners to prevent duplicates
  room.removeAllListeners();
  roomEventsBound = true;
  
  // Connection state changes
  room.on(LivekitClient.RoomEvent.ConnectionStateChanged, (state) => {
    console.log('Connection state changed:', state);
    switch (state) {
      case LivekitClient.ConnectionState.Connecting:
        updateConnectionStatus('Connecting...');
        break;
      case LivekitClient.ConnectionState.Connected:
        updateConnectionStatus('Connected');
        isReconnecting = false;
        break;
      case LivekitClient.ConnectionState.Disconnected:
        updateConnectionStatus('Disconnected');
        if (!isReconnecting) {
          // Clean up resources
          cleanupRoom();
        }
        break;
      case LivekitClient.ConnectionState.Reconnecting:
        updateConnectionStatus('Reconnecting...');
        isReconnecting = true;
        break;
      default:
        break;
    }
  });
  
  // Participant events
  room.on(LivekitClient.RoomEvent.ParticipantConnected, (participant) => {
    console.log('Participant connected:', participant.identity);
    
    // Ensure the participant is added to the participants Map
    if (room.participants) {
      room.participants.set(participant.sid, participant);
      console.log('Added participant to Map:', participant.identity, 'with SID:', participant.sid);
    } else {
      console.log('Cannot add participant to Map - room.participants is undefined');
    }
    
    console.log('Current participants after connection:', 
      Array.from(room.participants?.entries() || []).map(([sid, p]) => ({ sid, identity: p.identity }))
    );
    showToast(`${participant.identity} joined the room`);
    updateParticipantGrid();
  });
  
  room.on(LivekitClient.RoomEvent.ParticipantDisconnected, (participant) => {
    console.log('Participant disconnected:', participant.identity);
    
    // Remove the participant from the participants Map
    if (room.participants && participant.sid) {
      room.participants.delete(participant.sid);
      console.log('Removed participant from Map:', participant.identity, 'with SID:', participant.sid);
    }
    
    showToast(`${participant.identity} left the room`);
    updateParticipantGrid();
  });
  
  // Track events
  room.on(LivekitClient.RoomEvent.TrackSubscribed, (track, publication, participant) => {
    console.log('Track subscribed:', track.kind, 'from', participant.identity);
    
    // Special handling for screen share tracks
    if (track.source === LivekitClient.Track.Source.ScreenShare) {
      console.log('Screen share track subscribed from:', participant.identity);
      
      // Set as active screen share
      activeScreenShareId = participant.identity;
      
      // Force a complete grid update to reorganize tiles
      setTimeout(() => {
        updateParticipantGrid();
      }, 100);
    }
    
    updateParticipantGrid();
    
    if (track.kind === LivekitClient.Track.Kind.Audio) {
      setupAudioVisualization(participant);
    }
  });
  
  room.on(LivekitClient.RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
    console.log('Track unsubscribed:', track.kind, 'from', participant.identity);
    
    // Special handling for screen share tracks
    if (track.source === LivekitClient.Track.Source.ScreenShare) {
      console.log('Screen share track unsubscribed from:', participant.identity);
      
      // If this was the active screen share, reset it
      if (activeScreenShareId === participant.identity) {
        activeScreenShareId = null;
      }
      
      // Remove the screen share tile from the DOM
      const screenTile = document.getElementById(`screen-${participant.identity}`);
      if (screenTile) {
        screenTile.remove();
      }
      
      // Force a complete grid update to reorganize tiles
      setTimeout(() => {
        updateParticipantGrid();
      }, 100);
    }
    
    updateParticipantGrid();
  });
  
  room.on(LivekitClient.RoomEvent.TrackMuted, (publication, participant) => {
    console.log('Track muted:', publication.kind, 'from', participant.identity);
    
    // Special handling for screen share tracks
    if (publication.source === LivekitClient.Track.Source.ScreenShare) {
      console.log('Screen share track muted from:', participant.identity);
      
      // If this was the active screen share, handle it similar to unsubscribe
      if (activeScreenShareId === participant.identity) {
        // Force a complete grid update to reorganize tiles
        setTimeout(() => {
          updateParticipantGrid();
        }, 100);
      }
    }
    
    // Only update grid if the room is still connected
    if (room && room.state === LivekitClient.ConnectionState.Connected) {
      updateParticipantGrid();
    }
  });
  
  room.on(LivekitClient.RoomEvent.TrackUnmuted, (publication, participant) => {
    console.log('Track unmuted:', publication.kind, 'from', participant.identity);
    
    // Special handling for screen share tracks
    if (publication.source === LivekitClient.Track.Source.ScreenShare) {
      console.log('Screen share track unmuted from:', participant.identity);
      
      // Set as active screen share
      activeScreenShareId = participant.identity;
      
      // Force a complete grid update to reorganize tiles
      setTimeout(() => {
        updateParticipantGrid();
      }, 100);
    }
    
    // Only update grid if the room is still connected
    if (room && room.state === LivekitClient.ConnectionState.Connected) {
      updateParticipantGrid();
    }
  });
  
  // Active speaker detection
  room.on(LivekitClient.RoomEvent.ActiveSpeakersChanged, (speakers) => {
    // Only update if the room is still connected
    if (room && room.state === LivekitClient.ConnectionState.Connected) {
      highlightActiveSpeakers(speakers);
    }
  });
  
  // Connection quality
  room.on(LivekitClient.RoomEvent.ConnectionQualityChanged, (quality, participant) => {
    // Only update if the room is still connected
    if (room && room.state === LivekitClient.ConnectionState.Connected) {
      updateConnectionQuality(quality, participant);
    }
  });
  
  // Disconnection
  room.on(LivekitClient.RoomEvent.Disconnected, () => {
    console.log('Disconnected from room');
    if (!isReconnecting) {
      connectModal.classList.remove('hidden');
      statusBanner.classList.add('hidden');
      videoGrid.innerHTML = '';
      cleanupRoom();
    }
  });
}

// Clean up room resources
function cleanupRoom() {
  // Clear any existing audio analyzers
  audioAnalysers.clear();
  
  // Reset state
  micEnabled = false;
  cameraEnabled = false;
  screenShareTrack = null;
  roomEventsBound = false;
  
  // Clear participant refresh interval
  if (participantRefreshInterval) {
    clearInterval(participantRefreshInterval);
    participantRefreshInterval = null;
  }
  
  // Clean up room object
  if (room) {
    room.removeAllListeners();
    room = null;
  }
}

// Join a room
async function joinRoom(username, roomName, options = {}) {
  try {
    // Show connecting status
    updateConnectionStatus('Connecting...');
    statusBanner.classList.remove('hidden');
    
    // Get token from server
    const response = await fetch(`/api/get-token?username=${encodeURIComponent(username)}&room=${encodeURIComponent(roomName)}`);
    if (!response.ok) {
      throw new Error(`Failed to get token: ${response.status} ${response.statusText}`);
    }
    
    const { token, url } = await response.json();
    if (!token) {
      throw new Error('Invalid token response from server');
    }
    
    console.log('Received token and URL from server:', { url });
    
    // If we already have a room, disconnect from it first
    if (room && room.state !== LivekitClient.ConnectionState.Disconnected) {
      try {
        await room.disconnect();
        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (disconnectError) {
        console.log('Error disconnecting from previous room:', disconnectError);
        // Continue anyway
      }
    }
    
    // Create a new room instance
    room = new LivekitClient.Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: { width: 640, height: 480 }
      }, 
      publishDefaults: {
        simulcast: true
      },
      autoSubscribe: true
    });
    
    // Initialize the participants Map if it doesn't exist
    if (!room.participants) {
      console.log('Creating participants Map since it was undefined');
      room.participants = new Map();
    }
    
    // Setup room events
    setupRoomEvents();
    
    // Connect to room with proper error handling
    try {
      // Try different URL formats if needed
      // For local development, ws:// usually works better than wss://
      let wsUrl = url || 'ws://localhost:7880';
      
      // If URL starts with wss:// but we're on localhost, try ws:// instead
      if (wsUrl.startsWith('wss://localhost')) {
        wsUrl = wsUrl.replace('wss://', 'ws://');
      }
      
      console.log('Connecting to LiveKit server at:', wsUrl);
      
      // Connect with explicit options to ensure we get remote participants
      await room.connect(wsUrl, token, {
        autoSubscribe: true
      });
      
      console.log('Connected to room:', room.name);
      console.log('Room state after connection:', room.state);
      console.log('Initial participants:', Array.from(room.participants?.entries() || []).map(([sid, p]) => ({ sid, identity: p.identity })));
      
      // Manual participant discovery - request the list of participants from the server
      try {
        console.log('Attempting manual participant discovery');
        
        // If room.participants is empty or undefined, try to get participants from the server
        if (!room.participants || room.participants.size === 0) {
          // Try to access the internal LiveKit client if available
          if (room._client && typeof room._client.getParticipants === 'function') {
            console.log('Using internal LiveKit client to get participants');
            const serverParticipants = await room._client.getParticipants();
            console.log('Server participants:', serverParticipants);
            
            // Initialize participants Map if needed
            if (!room.participants) {
              room.participants = new Map();
            }
            
            // Add each participant to our Map
            serverParticipants.forEach(participantInfo => {
              if (participantInfo.sid && participantInfo.identity && participantInfo.sid !== room.localParticipant.sid) {
                // Create a basic RemoteParticipant object if the SDK doesn't provide one
                const remoteParticipant = new LivekitClient.RemoteParticipant(
                  participantInfo.sid,
                  participantInfo.identity,
                  { metadata: participantInfo.metadata }
                );
                
                room.participants.set(participantInfo.sid, remoteParticipant);
                console.log('Manually added participant:', participantInfo.identity, 'with SID:', participantInfo.sid);
              }
            });
          } else {
            console.log('LiveKit client getParticipants method not available');
          }
        }
      } catch (discoveryError) {
        console.error('Error during manual participant discovery:', discoveryError);
      }
      
      // Request an update of participants from the server
      if (typeof room.syncState === 'function') {
        try {
          console.log('Requesting participant sync from server');
          await room.syncState();
          console.log('Sync completed, participants after sync:', 
            Array.from(room.participants?.entries() || []).map(([sid, p]) => ({ sid, identity: p.identity }))
          );
        } catch (syncError) {
          console.error('Error syncing room state:', syncError);
        }
      } else {
        console.log('Room.syncState method not available in this version of LiveKit');
      }
      
      // Save current room name
      currentRoom = roomName;
      
      // Hide connect modal
      connectModal.classList.add('hidden');
      
      // Enable local tracks with proper error handling
      try {
        // Use the device options from PreJoin if available
        const connectOptions = {
          audioDeviceId: options.audioDeviceId,
          videoDeviceId: options.videoDeviceId
        };
        
        if (options.audioEnabled && options.videoEnabled) {
          await room.localParticipant.enableCameraAndMicrophone(connectOptions);
          micEnabled = true;
          cameraEnabled = true;
        } else {
          // Handle each track separately based on user preferences
          if (options.videoEnabled) {
            await room.localParticipant.setCameraEnabled(true, connectOptions);
            cameraEnabled = true;
          } else {
            cameraEnabled = false;
          }
          
          if (options.audioEnabled) {
            await room.localParticipant.setMicrophoneEnabled(true, connectOptions);
            micEnabled = true;
          } else {
            micEnabled = false;
          }
        }
        
        updateMicButton();
        updateCameraButton();
      } catch (mediaError) {
        console.error('[ERROR] Error enabling camera and microphone:', mediaError);
        
        // Still allow connection even if media fails
        if (mediaError.name === 'NotAllowedError' || mediaError.message.includes('Permission denied')) {
          permissionsWarning.classList.remove('hidden');
          showToast('Camera and microphone access denied. Please check your permissions.');
        } else {
          showToast('Failed to enable camera and microphone: ' + (mediaError.message || 'Unknown error'));
        }
        
        // Set initial state to reflect reality
        micEnabled = false;
        cameraEnabled = false;
        updateMicButton();
        updateCameraButton();
      }
      
      // Update UI
      updateParticipantGrid();
      
      // Update connection status
      updateConnectionStatus('Connected');
      showToast(`Joined room: ${roomName}`);
      
      // Start periodic participant refresh with improved detection
      participantRefreshInterval = setInterval(() => {
        // Always do an initial refresh when a participant joins
        if (room) {
          // Force an initial update when joining the room
          updateParticipantGrid();
        }
      }, 3000);
    } catch (connectionError) {
      console.error('[ERROR] Error connecting to room:', connectionError);
      updateConnectionStatus('Connection failed');
      throw connectionError;
    }
  } catch (error) {
    console.error('[ERROR] Error joining room:', error);
    
    // Check for permission errors
    if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
      permissionsWarning.classList.remove('hidden');
    }
    
    throw error;
  }
}

// Populate device options
async function populateDeviceOptions() {
  try {
    // Request permissions first
    await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    
    // Get available devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    // Filter audio input devices
    const audioInputs = devices.filter(device => device.kind === 'audioinput');
    audioInputSelect.innerHTML = '';
    audioInputs.forEach(device => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || `Microphone ${audioInputSelect.length + 1}`;
      audioInputSelect.appendChild(option);
    });
    
    // Filter video input devices
    const videoInputs = devices.filter(device => device.kind === 'videoinput');
    videoInputSelect.innerHTML = '';
    videoInputs.forEach(device => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || `Camera ${videoInputSelect.length + 1}`;
      videoInputSelect.appendChild(option);
    });

    // Add device selection change event listeners
    audioInputSelect.addEventListener('change', async () => {
      try {
        if (!room || !room.localParticipant) {
          console.log('Cannot change audio device: Not connected to a room');
          return;
        }
        
        const deviceId = audioInputSelect.value;
        if (!deviceId) return;
        
        await room.switchActiveDevice(LivekitClient.Track.Kind.Audio, deviceId);
        showToast('Microphone changed');
      } catch (error) {
        console.error('[ERROR] Failed to switch audio device:', error);
        showToast('Failed to change microphone: ' + (error.message || 'Unknown error'));
      }
    });
    
    videoInputSelect.addEventListener('change', async () => {
      try {
        if (!room || !room.localParticipant) {
          console.log('Cannot change video device: Not connected to a room');
          return;
        }
        
        const deviceId = videoInputSelect.value;
        if (!deviceId) return;
        
        await room.switchActiveDevice(LivekitClient.Track.Kind.Video, deviceId);
        showToast('Camera changed');
      } catch (error) {
        console.error('[ERROR] Failed to switch video device:', error);
        showToast('Failed to change camera: ' + (error.message || 'Unknown error'));
      }
    });
  } catch (error) {
    console.error('Failed to enumerate devices:', error);
    
    // Check for permission errors
    if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
      permissionsWarning.classList.remove('hidden');
    }
  }
}

// Refresh available audio and video input devices
function refreshInputDevices() {
  // Only run if browser has navigator.mediaDevices API
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.log('Browser does not support mediaDevices API');
    return;
  }
  
  navigator.mediaDevices.enumerateDevices()
    .then(devices => {
      // Clear current options
      while (audioInputSelect.firstChild) {
        audioInputSelect.removeChild(audioInputSelect.firstChild);
      }
      
      while (videoInputSelect.firstChild) {
        videoInputSelect.removeChild(videoInputSelect.firstChild);
      }
      
      // Add default option
      const audioDefaultOption = document.createElement('option');
      audioDefaultOption.value = 'default';
      audioDefaultOption.text = 'Default Microphone';
      audioInputSelect.appendChild(audioDefaultOption);
      
      const videoDefaultOption = document.createElement('option');
      videoDefaultOption.value = 'default';
      videoDefaultOption.text = 'Default Camera';
      videoInputSelect.appendChild(videoDefaultOption);
      
      // Filter for audio and video input devices
      const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
      const videoInputDevices = devices.filter(device => device.kind === 'videoinput');
      
      // Populate audio select
      audioInputDevices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `Microphone ${audioInputSelect.length + 1}`;
        audioInputSelect.appendChild(option);
      });
      
      // Populate video select
      videoInputDevices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `Camera ${videoInputSelect.length + 1}`;
        videoInputSelect.appendChild(option);
      });
    })
    .catch(err => {
      console.error('Error enumerating devices:', err);
    });
}

// Refresh available audio output devices (speakers)
function refreshAudioOutputDevices() {
  // Only proceed if the browser supports audioOutput selection
  if (!('sinkId' in HTMLMediaElement.prototype)) {
    console.log('Browser does not support output device selection');
    
    // Clear and add single option
    while (audioOutputSelect.firstChild) {
      audioOutputSelect.removeChild(audioOutputSelect.firstChild);
    }
    
    const defaultOption = document.createElement('option');
    defaultOption.value = 'default';
    defaultOption.text = 'Default (Browser Controlled)';
    audioOutputSelect.appendChild(defaultOption);
    
    return;
  }
  
  navigator.mediaDevices.enumerateDevices()
    .then(devices => {
      // Clear current options
      while (audioOutputSelect.firstChild) {
        audioOutputSelect.removeChild(audioOutputSelect.firstChild);
      }
      
      // Add default option
      const defaultOption = document.createElement('option');
      defaultOption.value = 'default';
      defaultOption.text = 'Default Speaker';
      audioOutputSelect.appendChild(defaultOption);
      
      // Filter for audio output devices
      const audioOutputDevices = devices.filter(device => device.kind === 'audiooutput');
      
      // Populate select
      audioOutputDevices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `Speaker ${audioOutputSelect.length + 1}`;
        audioOutputSelect.appendChild(option);
      });
    })
    .catch(err => {
      console.error('Error enumerating output devices:', err);
    });
}

// Handle audio output device change
function handleAudioOutputChange() {
  const outputDeviceId = audioOutputSelect.value;
  
  if (!room) {
    console.log('Room not connected yet, audio output will be set when connected');
    return;
  }
  
  try {
    // Set sink ID for all audio elements
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(el => {
      if (typeof el.sinkId !== 'undefined') {
        el.setSinkId(outputDeviceId)
          .then(() => {
            console.log(`Success, audio output device attached: ${outputDeviceId}`);
          })
          .catch(error => {
            console.error('Error setting audio output:', error);
          });
      }
    });
    
    showToast('Speaker changed successfully');
  } catch (err) {
    console.error('Error changing audio output:', err);
    showToast('Failed to change speaker');
  }
}

// Update connection status
function updateConnectionStatus(status) {
  statusText.textContent = status;
  statusBanner.classList.remove('hidden');
}

// Update participant grid
function updateParticipantGrid() {
  try {
    console.log('Updating participant grid');
    
    if (!room) {
      console.log('Room object is not available');
      return;
    }
    
    // Keep track of all participants we process
    const processedParticipantIds = new Set();
    const existingTiles = {};
    
    // First, gather all existing participant tiles
    const existingElements = videoGrid.querySelectorAll('[id^="participant-"]');
    existingElements.forEach(el => {
      const participantId = el.id.replace('participant-', '');
      existingTiles[participantId] = el;
    });
    
    // Process the local participant
    if (room.localParticipant) {
      const localId = room.localParticipant.identity;
      processedParticipantIds.add(localId);
      
      if (existingTiles[localId]) {
        // Update existing local participant tile
        console.log('Updating existing local participant tile:', localId);
        updateParticipantTile(existingTiles[localId], room.localParticipant, true);
      } else {
        // Create new local participant tile
        console.log('Creating new local participant tile:', localId);
        createParticipantTile(room.localParticipant, true);
      }
    }
    
    // Process remote participants
    let remoteParticipants = [];
    
    // Method 1: Check room.participants (standard Map in newer SDK versions)
    if (room.participants instanceof Map) {
      remoteParticipants = Array.from(room.participants.values());
      console.log('Found remote participants from Map:', remoteParticipants.map(p => p.identity));
    } 
    // Method 2: Try alternative ways to get participants
    else if (room.participants) {
      try {
        if (Array.isArray(room.participants)) {
          remoteParticipants = room.participants;
        } else if (typeof room.participants === 'object') {
          remoteParticipants = Object.values(room.participants);
        }
        console.log('Found remote participants from object:', remoteParticipants.map(p => p.identity));
      } catch (e) {
        console.error('Error getting participants:', e);
      }
    }
    
    // Method 3: Check room.remoteParticipants as fallback
    if (remoteParticipants.length === 0 && room.remoteParticipants) {
      try {
        if (room.remoteParticipants instanceof Map) {
          remoteParticipants = Array.from(room.remoteParticipants.values());
        } else if (Array.isArray(room.remoteParticipants)) {
          remoteParticipants = room.remoteParticipants;
        } else if (typeof room.remoteParticipants === 'object') {
          remoteParticipants = Object.values(room.remoteParticipants);
        }
        console.log('Found remote participants from remoteParticipants:', remoteParticipants.map(p => p.identity));
      } catch (e) {
        console.error('Error getting remote participants:', e);
      }
    }
    
    // Method 4: Last resort, check _state
    if (remoteParticipants.length === 0 && room._state && room._state.participants) {
      try {
        const stateParticipants = Object.values(room._state.participants);
        // Filter out the local participant
        const remoteStateParticipants = stateParticipants.filter(p => 
          p && p.sid && room.localParticipant && p.sid !== room.localParticipant.sid);
        remoteParticipants = remoteStateParticipants;
        console.log('Found remote participants from _state:', remoteParticipants.map(p => p.identity || 'Unknown'));
      } catch (e) {
        console.error('Error getting state participants:', e);
      }
    }
    
    console.log(`Processing ${remoteParticipants.length} remote participants`);
    remoteParticipants.forEach(participant => {
      if (!participant || !participant.identity) {
        console.log('Skipping invalid participant:', participant);
        return;
      }
      
      const remoteId = participant.identity;
      processedParticipantIds.add(remoteId);
      
      console.log('Processing remote participant:', remoteId);
      
      if (existingTiles[remoteId]) {
        // Update existing remote participant tile
        console.log('Updating existing remote participant tile:', remoteId);
        updateParticipantTile(existingTiles[remoteId], participant, false);
      } else {
        // Create new remote participant tile
        console.log('Creating new remote participant tile:', remoteId);
        createParticipantTile(participant, false);
      }
    });
    
    // Remove tiles for participants who are no longer in the room
    Object.keys(existingTiles).forEach(participantId => {
      if (!processedParticipantIds.has(participantId)) {
        console.log('Removing tile for disconnected participant:', participantId);
        existingTiles[participantId].remove();
      }
    });
    
  } catch (error) {
    console.error('[ERROR] Error updating participant grid:', error);
  }
}

// Update an existing participant tile
function updateParticipantTile(tileElement, participant, isLocal) {
  try {
    // Update video if needed
    const videoContainer = tileElement.querySelector('div:first-child');
    const existingVideo = videoContainer.querySelector('video');
    const videoPublication = participant.getTrackPublication(LivekitClient.Track.Source.Camera);
    
    if (videoPublication && videoPublication.track && !videoPublication.isMuted) {
      if (!existingVideo) {
        // Add video if not present
        const videoElement = videoPublication.track.attach();
        videoElement.autoplay = true;
        videoElement.className = 'w-full h-full object-cover';
        
        // If this is the local participant, mirror the video
        if (isLocal) {
          videoElement.style.transform = 'scaleX(-1)';
        }
        
        videoContainer.appendChild(videoElement);
      }
    } else if (existingVideo) {
      // Remove video if track is muted or no longer available
      existingVideo.remove();
    }
    
    // Update audio indicator
    const audioIndicator = tileElement.querySelector(`#audio-indicator-${participant.identity}`);
    const audioPublication = participant.getTrackPublication(LivekitClient.Track.Source.Microphone);
    
    if (audioPublication && !audioPublication.isMuted) {
      audioIndicator.classList.add('bg-green-500');
      audioIndicator.classList.remove('bg-red-500');
    } else {
      audioIndicator.classList.add('bg-red-500');
      audioIndicator.classList.remove('bg-green-500');
    }
    
    // Check for screen share
    const screenShareIndicator = tileElement.querySelector('.bg-blue-600');
    const screenPublication = participant.getTrackPublication(LivekitClient.Track.Source.ScreenShare);
    
    if (screenPublication && screenPublication.track && !screenPublication.isMuted) {
      // Add screen share indicator if not present
      if (!screenShareIndicator) {
        const indicator = document.createElement('div');
        indicator.className = 'absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded';
        indicator.textContent = 'Sharing Screen';
        videoContainer.appendChild(indicator);
      }
      
      // Create or update screen share tile
      const screenTileId = `screen-${participant.identity}`;
      let screenTile = document.getElementById(screenTileId);
      
      if (!screenTile) {
        createScreenShareTile(participant, screenPublication);
      }
    } else if (screenShareIndicator) {
      // Remove screen share indicator if no longer sharing
      screenShareIndicator.remove();
      
      // Remove screen share tile
      const screenTileId = `screen-${participant.identity}`;
      const screenTile = document.getElementById(screenTileId);
      if (screenTile) {
        screenTile.remove();
      }
    }
  } catch (error) {
    console.error('Error updating participant tile:', error);
  }
}

// Create a participant tile
function createParticipantTile(participant, isLocal) {
  const tile = document.createElement('div');
  tile.id = `participant-${participant.identity}`;
  tile.className = 'relative bg-gray-800 rounded-lg overflow-hidden';
  tile.style.cssText = 'aspect-ratio: 16/9;';
  
  // Create video container
  const videoContainer = document.createElement('div');
  videoContainer.className = 'absolute inset-0';
  tile.appendChild(videoContainer);
  
  // Create info bar
  const infoBar = document.createElement('div');
  infoBar.className = 'absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-10 p-2 flex justify-between items-center';
  
  // Participant name
  const nameElement = document.createElement('span');
  nameElement.className = 'text-white text-sm';
  nameElement.textContent = isLocal ? `${participant.identity} (You)` : participant.identity;
  infoBar.appendChild(nameElement);
  
  // Indicators container
  const indicators = document.createElement('div');
  indicators.className = 'flex items-center gap-2';
  
  // Audio indicator
  const audioIndicator = document.createElement('div');
  audioIndicator.className = 'h-4 w-4 rounded-full bg-red-500';
  audioIndicator.id = `audio-indicator-${participant.identity}`;
  indicators.appendChild(audioIndicator);
  
  // Connection quality indicator
  const qualityIndicator = document.createElement('div');
  qualityIndicator.className = 'text-white text-xs';
  qualityIndicator.id = `connection-quality-${participant.identity}`;
  qualityIndicator.innerHTML = `<svg class="w-4 h-4" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v4M12 10v8M16 6v12"></path>
  </svg>`;
  indicators.appendChild(qualityIndicator);
  
  infoBar.appendChild(indicators);
  tile.appendChild(infoBar);
  videoGrid.appendChild(tile);
  
  // Attach video track if available
  const videoPublication = participant.getTrackPublication(LivekitClient.Track.Source.Camera);
  if (videoPublication && videoPublication.track && !videoPublication.isMuted) {
    const videoElement = videoPublication.track.attach();
    videoElement.autoplay = true;
    videoElement.className = 'w-full h-full object-cover';
    videoContainer.appendChild(videoElement);
    
    // If this is the local participant, mirror the video
    if (isLocal) {
      videoElement.style.transform = 'scaleX(-1)';
    }
  }
  
  // Check if screen share is active
  let screenPublication = participant.getTrackPublication(LivekitClient.Track.Source.ScreenShare);
  
  // If we're the local participant and have an active screen share track but no publication found yet
  if (isLocal && screenShareTrack && !screenPublication) {
    console.log('Local participant has active screen share track but no publication found via getTrackPublication');
    
    // Try to find the screen share publication by iterating through all track publications
    const publications = participant.trackPublications;
    console.log('All local participant publications:', Array.from(publications.values()).map(p => ({ sid: p.trackSid, source: p.source, kind: p.kind })));
    
    // Find the screen share publication manually
    for (const pub of publications.values()) {
      if (pub.track && pub.track === screenShareTrack) {
        console.log('Found screen share publication by direct track comparison:', pub.trackSid);
        screenPublication = pub;
        break;
      }
    }
  }
  
  if (screenPublication && screenPublication.track && !screenPublication.isMuted) {
    console.log('Found screen share publication for participant:', participant.identity, 'trackSid:', screenPublication.trackSid);
    
    // Create a screen share indicator
    const screenShareIndicator = document.createElement('div');
    screenShareIndicator.className = 'absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded';
    screenShareIndicator.textContent = 'Sharing Screen';
    videoContainer.appendChild(screenShareIndicator);
    
    // Create a separate tile for the screen share
    createScreenShareTile(participant, screenPublication);
  } else if (isLocal && screenShareTrack) {
    console.log('Local participant has active screen share track but no publication found');
    
    // Create a direct screen share tile using the local track (fallback method)
    createDirectScreenShareTile(participant, screenShareTrack);
  }
  
  // Update audio indicator based on track state
  const audioPublication = participant.getTrackPublication(LivekitClient.Track.Source.Microphone);
  if (audioPublication && !audioPublication.isMuted) {
    audioIndicator.classList.add('bg-green-500');
    audioIndicator.classList.remove('bg-red-500');
  }
}

// Create a screen share tile
function createScreenShareTile(participant, screenPublication) {
  console.log('Creating screen share tile for participant:', participant.identity);
  
  const tile = document.createElement('div');
  tile.id = `screen-${participant.identity}`;
  tile.className = 'relative bg-gray-800 rounded-lg overflow-hidden';
  tile.style.cssText = 'aspect-ratio: 16/9;';
  
  // Create screen container
  const screenContainer = document.createElement('div');
  screenContainer.className = 'absolute inset-0';
  
  // Attach screen share track
  const screenElement = screenPublication.track.attach();
  screenElement.className = 'w-full h-full object-contain';
  screenContainer.appendChild(screenElement);
  tile.appendChild(screenContainer);
  
  // Create info bar
  const infoBar = document.createElement('div');
  infoBar.className = 'absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-70 p-2 flex justify-between items-center';
  
  // Screen share label
  const label = document.createElement('div');
  label.className = 'text-white text-sm';
  label.textContent = `${participant.identity}'s Screen`;
  infoBar.appendChild(label);
  
  tile.appendChild(infoBar);
  videoGrid.appendChild(tile);
  
  // Track this screen share as the active one
  activeScreenShareId = participant.identity;
  
  console.log('Screen share tile created and added to grid');
  
  return tile;
}

// Create a direct screen share tile using the local track (fallback method)
function createDirectScreenShareTile(participant, track) {
  console.log('Creating direct screen share tile for participant:', participant.identity);
  
  const tile = document.createElement('div');
  tile.id = `screen-direct-${participant.identity}`;
  tile.className = 'relative bg-gray-800 rounded-lg overflow-hidden';
  tile.style.cssText = 'aspect-ratio: 16/9;';
  
  // Create screen container
  const screenContainer = document.createElement('div');
  screenContainer.className = 'absolute inset-0';
  tile.appendChild(screenContainer);
  
  // Attach screen share directly
  console.log('Attaching screen share track directly');
  const screenElement = track.mediaStreamTrack ? new MediaStream([track.mediaStreamTrack]).getTracks()[0].attach() : track.attach();
  screenElement.autoplay = true;
  screenElement.className = 'w-full h-full object-contain';
  screenContainer.appendChild(screenElement);
  
  // Create info bar
  const infoBar = document.createElement('div');
  infoBar.className = 'absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-70 p-2';
  
  // Screen share label
  const label = document.createElement('div');
  label.className = 'text-white text-sm';
  label.textContent = `${participant.identity}'s Screen (Direct)`;
  infoBar.appendChild(label);
  
  tile.appendChild(infoBar);
  videoGrid.appendChild(tile);
  
  console.log('Direct screen share tile created and added to grid');
}

// Setup audio visualization
function setupAudioVisualization(participant) {
  try {
    const audioPublication = participant.getTrackPublication(LivekitClient.Track.Source.Microphone);
    
    if (!audioPublication || !audioPublication.track) {
      return;
    }
    
    // Skip if we already have an analyser for this participant
    if (audioAnalysers.has(participant.sid)) {
      return;
    }
    
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      
      // Get audio source
      const audioElement = audioPublication.track.attach();
      const source = audioContext.createMediaStreamSource(audioElement.srcObject);
      source.connect(analyser);
      
      // Store the analyser
      audioAnalysers.set(participant.sid, { analyser, audioContext });
      
      // Start visualization
      visualizeAudio(participant);
    } catch (error) {
      console.error('Failed to setup audio visualization:', error);
    }
  } catch (error) {
    console.error('[ERROR] Error in setupAudioVisualization:', error);
  }
}

// Visualize audio levels
function visualizeAudio(participant) {
  try {
    const analyserData = audioAnalysers.get(participant.sid);
    if (!analyserData) return;
    
    const { analyser } = analyserData;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const audioIndicator = document.getElementById(`audio-indicator-${participant.identity}`);
    if (!audioIndicator) return;
    
    // Update audio indicator based on volume
    const updateIndicator = () => {
      try {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        
        // Update indicator size based on volume
        const size = Math.max(4, Math.min(12, 4 + (average / 25)));
        audioIndicator.style.width = `${size}px`;
        audioIndicator.style.height = `${size}px`;
        
        // Request next frame only if the participant is still connected
        if (room && room.state === LivekitClient.ConnectionState.Connected) {
          requestAnimationFrame(updateIndicator);
        }
      } catch (error) {
        console.error('[ERROR] Error in audio visualization:', error);
      }
    };
    
    updateIndicator();
  } catch (error) {
    console.error('[ERROR] Error in visualizeAudio:', error);
  }
}

// Highlight active speakers
function highlightActiveSpeakers(speakers) {
  // Reset all participant tiles
  const allTiles = videoGrid.querySelectorAll('[id^="participant-"]');
  allTiles.forEach(tile => {
    tile.classList.remove('border-2', 'border-blue-500');
  });
  
  // Highlight active speakers
  speakers.forEach(speaker => {
    const tile = document.getElementById(`participant-${speaker.identity}`);
    if (tile) {
      tile.classList.add('border-2', 'border-blue-500');
    }
  });
}

// Update mic button UI
function updateMicButton() {
  if (micEnabled) {
    micIcon.classList.remove('hidden');
    micOffIcon.classList.add('hidden');
  } else {
    micIcon.classList.add('hidden');
    micOffIcon.classList.remove('hidden');
  }
  // Keep the background color gray regardless of state
  micBtn.classList.remove('bg-red-600');
  micBtn.classList.add('bg-gray-700');
}

// Update camera button UI
function updateCameraButton() {
  if (cameraEnabled) {
    cameraIcon.classList.remove('hidden');
    cameraOffIcon.classList.add('hidden');
  } else {
    cameraIcon.classList.add('hidden');
    cameraOffIcon.classList.remove('hidden');
  }
  // Keep the background color gray regardless of state
  cameraBtn.classList.remove('bg-red-600');
  cameraBtn.classList.add('bg-gray-700');
}

// Update connection quality indicator
function updateConnectionQuality(quality, participant) {
  const qualityIndicator = document.getElementById(`connection-quality-${participant.identity}`);
  if (!qualityIndicator) return;
  
  let qualityClass = '';
  let qualityText = '';
  
  switch (quality) {
    case LivekitClient.ConnectionQuality.Excellent:
      qualityClass = 'text-green-500';
      qualityText = 'Excellent';
      break;
    case LivekitClient.ConnectionQuality.Good:
      qualityClass = 'text-green-400';
      qualityText = 'Good';
      break;
    case LivekitClient.ConnectionQuality.Poor:
      qualityClass = 'text-yellow-500';
      qualityText = 'Poor';
      break;
    default:
      qualityClass = 'text-red-500';
      qualityText = 'Unknown';
  }
  
  qualityIndicator.className = `text-xs ${qualityClass}`;
  qualityIndicator.title = qualityText;
}

// Show toast notification
function showToast(message, duration = 3000) {
  toastMessage.textContent = message;
  toast.classList.remove('hidden');
  
  // Hide after duration
  setTimeout(() => {
    toast.classList.add('hidden');
  }, duration);
}

// Update existing participant tiles
function updateExistingParticipantTiles() {
  try {
    console.log('Updating existing participant tiles');
    
    // Process the local participant
    if (room.localParticipant) {
      const localId = room.localParticipant.identity;
      const localTile = document.getElementById(`participant-${localId}`);
      if (localTile) {
        updateParticipantTile(localTile, room.localParticipant, true);
      }
    }
    
    // Process remote participants
    const remoteParticipants = Array.from(room.participants?.values() || []);
    remoteParticipants.forEach(participant => {
      const remoteId = participant.identity;
      const remoteTile = document.getElementById(`participant-${remoteId}`);
      if (remoteTile) {
        updateParticipantTile(remoteTile, participant, false);
      }
    });
  } catch (error) {
    console.error('[ERROR] Error updating existing participant tiles:', error);
  }
}

// Check if any participant is sharing their screen
function hasAnyScreenShare() {
  if (!room) return false;
  
  try {
    // Check local participant
    if (room.localParticipant) {
      const localScreenShare = room.localParticipant.getTrackPublication(LivekitClient.Track.Source.ScreenShare);
      if (localScreenShare && localScreenShare.track && !localScreenShare.isMuted) {
        return true;
      }
    }
    
    // Check remote participants
    let remoteParticipants = [];
    
    if (room.participants instanceof Map) {
      remoteParticipants = Array.from(room.participants.values());
    } else if (room.participants) {
      try {
        if (Array.isArray(room.participants)) {
          remoteParticipants = room.participants;
        } else if (typeof room.participants === 'object') {
          remoteParticipants = Object.values(room.participants);
        }
      } catch (e) {
        console.error('Error checking participants for screen share:', e);
      }
    }
    
    for (const participant of remoteParticipants) {
      const screenPublication = participant.getTrackPublication(LivekitClient.Track.Source.ScreenShare);
      if (screenPublication && screenPublication.track && !screenPublication.isMuted) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking for screen shares:', error);
    return false;
  }
}
