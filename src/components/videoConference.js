// LiveKit configuration
let room;
let isReconnecting = false;

// Create a centralized participant manager
const ParticipantManager = {
  participants: new Map(),
  screenShares: new Map(),
  lastGridUpdate: 0,
  updateTimer: null,
  adminViewState: {
    viewMode: 'normal', // 'normal', 'expanded', or 'screenShareFullScreen'
    targetParticipantId: null,
    adminIdentity: null,
    timestamp: Date.now()
  },

  // Update or add a participant
  updateParticipant(participant, isLocal, isAdmin = false) {
    this.participants.set(participant.identity, {
      participant,
      isLocal,
      isAdmin,
      isSpeaking: participant.speaking,
      lastUpdated: Date.now()
    });
    this.scheduleGridUpdate();
  },

  // Remove a participant
  removeParticipant(identity) {
    this.participants.delete(identity);
    this.scheduleGridUpdate();
  },

  // Track screen shares
  updateScreenShare(participant, track, isActive) {
    try {
      const participantId = participant.identity;
      
      // If track is null or not active, remove the screen share entry
      if (!track || !isActive) {
        console.log('Removing screen share for participant:', participantId);
        if (this.screenShares.has(participantId)) {
          this.screenShares.delete(participantId);
        }
        
        // Check if we need to reset expanded view for this screenshare
        if (localViewState.isScreenShareFullScreen && localViewState.screenShareParticipantId === participantId) {
          localViewState.isScreenShareFullScreen = false;
          localViewState.screenShareParticipantId = null;
        }
        
        // Update grid
        this.scheduleGridUpdate();
        return;
      }
      
      // Otherwise add or update the screen share entry
      console.log('Adding screen share for participant:', participantId);
      this.screenShares.set(participantId, { participant, track });
      
      // Update grid
      this.scheduleGridUpdate();
    } catch (error) {
      console.error('Error updating screen share:', error);
    }
  },

  // Get count of participants
  getParticipantCount() {
    return getRealParticipantCount();
  },

  // Schedule grid update (with debounce)
  scheduleGridUpdate() {
    const now = Date.now();
    // Debounce updates to prevent too many in a short time
    if (now - this.lastGridUpdate < 100) {
      clearTimeout(this.updateTimer);
    }
    this.updateTimer = setTimeout(() => {
      this.lastGridUpdate = Date.now();
      updateGrid();
    }, 100);
  },
  
  // Check if current user is admin
  isCurrentUserAdmin() {
    if (!room || !room.localParticipant) return false;
    
    const participantInfo = this.participants.get(room.localParticipant.identity);
    return participantInfo && participantInfo.isAdmin;
  },

  // Set admin view state and validate permissions
  setAdminViewState(viewMode, targetParticipantId = null) {
    // Only admins can change admin view state
    if (!this.isCurrentUserAdmin()) {
      console.warn('Non-admin user attempted to set admin view state');
      return false;
    }
    
    this.adminViewState = {
      viewMode,
      targetParticipantId,
      adminIdentity: room.localParticipant.identity,
      timestamp: Date.now()
    };
    
    console.log('Admin view state updated:', this.adminViewState);
    return true;
  },
  
  // Clean up stale participants (memory leak prevention)
  cleanupStaleParticipants() {
    const now = Date.now();
    const staleThreshold = 60000; // 1 minute
    
    // Check for participants that haven't been updated recently
    for (const [identity, info] of this.participants.entries()) {
      if (now - info.lastUpdated > staleThreshold) {
        console.log('Removing stale participant:', identity);
        this.participants.delete(identity);
      }
    }
    
    // Same for screen shares
    for (const [identity, info] of this.screenShares.entries()) {
      if (now - info.lastUpdated > staleThreshold) {
        console.log('Removing stale screen share:', identity);
        this.screenShares.delete(identity);
      }
    }
  }
};

// DOM elements - wait for DOM to be fully loaded before accessing
let connectModal, permissionsWarning, joinBtn, usernameInput, roomInput;
let mainContainer, videoGrid, micBtn, cameraBtn, screenBtn, inviteBtn, leaveBtn, settingsBtn;
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
let serverUrl = "ws://localhost:7880";  // Default LiveKit server URL

// Local view state
let localViewState = {
  isExpandedView: false,
  expandedParticipantId: null,
  isScreenShareFullScreen: false,
  screenShareParticipantId: null,
  screenShareTrack: null,
  adminOverride: false
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  init();
  // Schedule an initial grid update after everything is set up
  setTimeout(() => {
    ParticipantManager.scheduleGridUpdate();
  }, 500);
});

async function init() {
  console.log('Initializing LiveKit app...');
  
  // Initialize DOM elements after DOM is loaded
  mainContainer = document.getElementById('mainContainer');
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
      
      // // Store username for future use
      // localStorage.setItem('livekit-username', usernameParam);
      
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
        // Check if we're already using path-based routing
        const isPathBasedRouting = window.roomNameFromPath !== undefined;
        if (!isPathBasedRouting) {
          // Redirect to the path-based URL
          window.location.href = `/room/${encodeURIComponent(roomNameFromPath)}`;
        }
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
  } catch (error) {
    console.error('Failed to initialize app:', error);
    showToast('Failed to initialize: ' + error.message);
  }
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
    //localStorage.setItem('livekit-username', username);
    
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
        
        // Update the participant manager
        ParticipantManager.updateScreenShare(room.localParticipant, null, false);

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
              ParticipantManager.scheduleGridUpdate();
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
          
          // Update the participant manager
          ParticipantManager.updateScreenShare(room.localParticipant, screenShareTrack, true);

          // Force update the participant grid
          ParticipantManager.scheduleGridUpdate();
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
    ParticipantManager.updateParticipant(participant, false);
  });
  
  room.on(LivekitClient.RoomEvent.ParticipantDisconnected, (participant) => {
    console.log('Participant disconnected:', participant.identity);
    
    // Remove the participant from the participants Map
    if (room.participants && participant.sid) {
      room.participants.delete(participant.sid);
      console.log('Removed participant from Map:', participant.identity, 'with SID:', participant.sid);
    }
    
    showToast(`${participant.identity} left the room`);
    ParticipantManager.removeParticipant(participant.identity);
  });
  
  // Track events
  room.on(LivekitClient.RoomEvent.TrackSubscribed, (track, publication, participant) => {
    console.log('Track subscribed:', track.kind, 'from', participant.identity);
    
    // Special handling for screen share tracks
    if (track.source === LivekitClient.Track.Source.ScreenShare) {
      console.log('Screen share track subscribed from:', participant.identity);
      
      // Set as active screen share
      activeScreenShareId = participant.identity;
      
      // Update participant manager
      ParticipantManager.updateScreenShare(participant, track, true);

      // Force a complete grid update to reorganize tiles
      ParticipantManager.scheduleGridUpdate();
    } else {
      // For regular audio/video tracks, try targeted update first
      const wasUpdated = updateParticipantTile(participant, track.kind);

      // Only do a full update if targeted update fails
      if (!wasUpdated) {
        ParticipantManager.scheduleGridUpdate();
      }
      
      // Make sure participant is added to the manager
      ParticipantManager.updateParticipant(participant, false);
    }
    
    // Setup audio visualization for audio tracks
    if (track.kind === 'audio') {
      setupAudioVisualization(participant);
    }
  });
  
  room.on(LivekitClient.RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
    console.log('Track unsubscribed:', track.kind, 'from', participant.identity);
    
    // Special handling for screen share tracks
    if (track.source === LivekitClient.Track.Source.ScreenShare) {
      console.log('Screen share track unsubscribed from:', participant.identity);
      
      // Update participant manager to remove screen share
      ParticipantManager.updateScreenShare(participant, null, false);
      
      // Early return - keep participant visible, just remove screenshare
      const wasUpdated = updateScreenShareTile(participant, null, false);

      // If tile couldn't be updated specifically, do a full grid update
      if (!wasUpdated) {
        // If this was the active screen share in fullscreen mode, reset the view
        if (localViewState.isScreenShareFullScreen && 
            localViewState.screenShareParticipantId === participant.identity) {
          localViewState.isScreenShareFullScreen = false;
          localViewState.screenShareParticipantId = null;
        }

        // Force a complete grid update
        ParticipantManager.scheduleGridUpdate();
      }
      
      return;
    }
    
    // For regular tracks, try targeted update
    const wasUpdated = updateParticipantTile(participant, track.kind);

    // Only do a full update if targeted update fails
    if (!wasUpdated) {
      ParticipantManager.scheduleGridUpdate();
    }
  });
  
  // Track mute/unmute events for incremental updates
  room.on(LivekitClient.RoomEvent.TrackMuted, (publication, participant) => {
    console.log('Track muted:', publication.kind, 'from', participant.identity);
    
    // Try to update just the specific tile first
    const trackKind = publication.kind;
    const wasUpdated = updateParticipantTile(participant, trackKind);
    
    // If the targeted update fails, fall back to full grid update
    if (!wasUpdated) {
      ParticipantManager.scheduleGridUpdate();
    }
  });
  
  room.on(LivekitClient.RoomEvent.TrackUnmuted, (publication, participant) => {
    console.log('Track unmuted:', publication.kind, 'from', participant.identity);
    
    // Try to update just the specific tile first
    const trackKind = publication.kind;
    const wasUpdated = updateParticipantTile(participant, trackKind);
    
    // If the targeted update fails, fall back to full grid update
    if (!wasUpdated) {
      ParticipantManager.scheduleGridUpdate();
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
    console.log('Joining room:', roomName);

    // Show connecting status
    updateConnectionStatus('Connecting...');
    statusBanner.classList.remove('hidden');
    
    // Create a room connection
    const token = await getToken(username, roomName);
    
    // Initialize LiveKit room
    room = new LivekitClient.Room({
      adaptiveStream: options.adaptiveStream || true,
      dynacast: options.dynacast || true,
      // Enable automatic track subscriptions (more reliable)
      autoSubscribe: true
    });
    
    // Setup event handlers
    setupRoomEvents();
    
    try {
      // Connect to room
      await room.connect(serverUrl, token);
      console.log('Connected to room:', room.name);
      
      // Set document title
      document.title = `LiveKit Room: ${room.name}`;
      
      // Get local devices
      const audioDevices = await navigator.mediaDevices.enumerateDevices();
      const hasAudio = audioDevices.some(device => device.kind === 'audioinput');
      const hasVideo = audioDevices.some(device => device.kind === 'videoinput');
      
      console.log('Audio available:', hasAudio);
      console.log('Video available:', hasVideo);
      
      // Connect local audio/video
      const connectOptions = {
        audio: hasAudio,
        video: hasVideo ? { facingMode: 'user' } : false
      };
      
      // Connect local tracks
      if (hasAudio || hasVideo) {
        await room.localParticipant.enableCameraAndMicrophone();
        console.log('Local media enabled');
      }
      
      // Update button states
      micEnabled = hasAudio;
      cameraEnabled = hasVideo;
      updateMicButton();
      updateCameraButton();
      
      // Hide connect modal
      connectModal.classList.add('hidden');
      
      // Show all room UI
      mainContainer.classList.remove('hidden');
      videoGrid.innerHTML = '';

      // Initialize local participant in our manager
      if (room.localParticipant) {
        ParticipantManager.updateParticipant(room.localParticipant, true);
      }
      
      // Populate device options
      await populateDeviceOptions();

      // Get initial participants
      console.log('Local participant:', room.localParticipant?.identity);
      console.log('Remote participants:', Array.from(room.participants?.entries() || []).map(([key, p]) => p.identity));
      
      // Update connection status
      updateConnectionStatus('Connected');
      showToast(`Joined room: ${roomName}`);
    } catch (error) {
      console.error('Error connecting to room:', error);
      updateConnectionStatus('Connection failed');
      showToast('Failed to connect to room: ' + error.message);

      // Show setup UI again
      connectModal.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error joining room:', error);
    showToast('Failed to join room: ' + error.message);
    
    // Show setup UI again
    connectModal.classList.remove('hidden');
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
function updateGrid() {
  try {
    // Verify room and container exist
    if (!room || !mainContainer) {
      console.error('Cannot update grid: Room or container not available');
      return;
    }
    
    // Clean up media tracks before grid update
    detachMediaTracks();
    
    // Clear the main container with safety check
    clearMainContainer();
    
    // Recreate the video grid
    videoGrid = document.createElement('div');
    videoGrid.id = 'videoGrid';
    videoGrid.className = 'grid gap-2 w-full h-full p-2';
    mainContainer.appendChild(videoGrid);
    
    // First check if there's any admin control active
    if (ParticipantManager.adminViewState.viewMode !== 'normal') {
      // Handle admin-controlled views
      const adminState = ParticipantManager.adminViewState;
      
      if (adminState.viewMode === 'expanded' && adminState.targetParticipantId) {
        // Render expanded participant view (admin controlled)
        renderExpandedView(adminState.targetParticipantId, true);
        return;
      } else if (adminState.viewMode === 'screenShareFullScreen' && adminState.targetParticipantId) {
        // Render full-screen screen share (admin controlled)
        renderScreenShareFullScreen(adminState.targetParticipantId, true);
        return;
      }
    }
    
    // If no admin control is active, or admin control is not valid, check local view states
    if (!localViewState.adminOverride) {
      // Handle local user's expanded view
      if (localViewState.isExpandedView && localViewState.expandedParticipantId) {
        renderExpandedView(localViewState.expandedParticipantId, false);
        return;
      }
      
      // Handle local user's screen share full screen
      if (localViewState.isScreenShareFullScreen && localViewState.screenShareParticipantId) {
        renderScreenShareFullScreen(localViewState.screenShareParticipantId, false);
        return;
      }
    }
    
    // If no special views are active, render normal grid
    renderNormalGrid();
  } catch (error) {
    console.error('Critical error updating grid:', error);
    try {
      // Last resort - reconstruct a basic grid
      if (mainContainer) {
        mainContainer.innerHTML = '';
        const basicGrid = document.createElement('div');
        basicGrid.id = 'videoGrid';
        basicGrid.className = 'grid gap-2 w-full h-full p-2';
        mainContainer.appendChild(basicGrid);
        
        // Try to restore at least local participant
        if (room && room.localParticipant) {
          const heightClass = 'h-64';
          createParticipantTile(room.localParticipant, true, heightClass);
        }
      }
    } catch (finalError) {
      console.error('Failed to create fallback grid:', finalError);
    }
  }
}

// Render the normal grid view with all participants
function renderNormalGrid() {
  try {
    // Get participant count using the existing robust function
    const count = getRealParticipantCount();
    
    // Apply the appropriate grid class based on participant count
    videoGrid.className = videoGrid.className.replace(/grid-cols-\d+/g, '');
    
    // Use the existing grid class determination logic
    const gridClassName = getGridClassName(count);
    videoGrid.classList.add(gridClassName);
    
    // Calculate tile height class based on participant count
    const heightClass = getTileHeight(count);
    
    // Add all participants to the grid
    for (const [identity, info] of ParticipantManager.participants.entries()) {
      const { participant, isLocal, isAdmin } = info;
      createParticipantTile(participant, isLocal, heightClass, isAdmin);
    }
    
    // Handle screen shares in normal view
    renderScreenSharesInGrid();
  } catch (error) {
    console.error('Error rendering normal grid:', error);
  }
}

// Render a participant in expanded view
function renderExpandedView(participantId, isAdminControlled = false) {
  try {
    const participantInfo = ParticipantManager.participants.get(participantId);
    if (!participantInfo) {
      console.warn('Expanded view: Participant not found, reverting to normal view');
      localViewState.isExpandedView = false;
      localViewState.expandedParticipantId = null;
      renderNormalGrid();
      return;
    }
    
    const { participant, isLocal, isAdmin } = participantInfo;
    
    // Clear the main container first
    mainContainer.innerHTML = '';
    
    // Create main expanded view container
    const expandedView = document.createElement('div');
    expandedView.className = 'expanded-view flex h-full';
    
    // Create sidebar for other participants
    const sidebar = document.createElement('div');
    sidebar.className = 'sidebar flex flex-col overflow-y-auto w-48 mr-2';
    
    // Create main content area
    const mainContent = document.createElement('div');
    mainContent.className = 'main-content flex-grow relative';
    
    // Add admin control indicator if needed
    if (isAdminControlled) {
      const adminIndicator = document.createElement('div');
      adminIndicator.className = 'lk-admin-control-indicator absolute top-4 left-4 bg-purple-700 text-white px-3 py-2 rounded-md z-50';
      adminIndicator.textContent = `Admin controlled view`;
      mainContent.appendChild(adminIndicator);
    }
    
    // Add expanded video tile to main content
    createParticipantTile(participant, isLocal, 'h-full', isAdmin, true, mainContent);
    
    // Add other participants to sidebar
    for (const [id, info] of ParticipantManager.participants.entries()) {
      if (id !== participantId) {
        const sidebarTile = document.createElement('div');
        sidebarTile.className = 'sidebar-tile relative h-32 mb-2';
        
        createParticipantTile(info.participant, info.isLocal, 'h-full', info.isAdmin, false, sidebarTile);
        
        // Add click handler to switch expanded view
        sidebarTile.addEventListener('click', () => {
          localViewState.expandedParticipantId = id;
          updateGrid();
        });
        
        sidebar.appendChild(sidebarTile);
      }
    }
    
    // Add screenshares to sidebar
    for (const [id, info] of ParticipantManager.screenShares.entries()) {
      const sidebarTile = document.createElement('div');
      sidebarTile.className = 'sidebar-tile relative h-32 mb-2';
      
      // Create thumbnail for screenshare
      const video = document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.className = 'w-full h-full object-contain';
      info.track.attach(video);
      sidebarTile.appendChild(video);
      
      // Add screenshare label
      const label = document.createElement('div');
      label.className = 'absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-70 p-2 text-white text-sm';
      label.textContent = `${id}'s Screen`;
      sidebarTile.appendChild(label);
      
      // Add click handler to switch to screenshare fullscreen
      sidebarTile.addEventListener('click', () => {
        toggleScreenShareFullScreen(id);
      });
      
      sidebar.appendChild(sidebarTile);
    }
    
    // Append sidebar and main content to expanded view
    expandedView.appendChild(sidebar);
    expandedView.appendChild(mainContent);
    
    // Add close button to return to normal view
    const closeButton = document.createElement('button');
    closeButton.className = 'absolute top-4 right-4 bg-gray-800 text-white p-2 rounded-md z-50';
    closeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    closeButton.addEventListener('click', () => {
      if (isAdminControlled && ParticipantManager.isCurrentUserAdmin()) {
        // Admin releasing control
        ParticipantManager.setAdminViewState('normal');
        broadcastAdminViewState({ viewMode: 'normal' });
      } else if (!isAdminControlled) {
        // Regular user closing their expanded view
        localViewState.isExpandedView = false;
        localViewState.expandedParticipantId = null;
      }
      updateGrid();
    });
    mainContent.appendChild(closeButton);
    
    // Add the expanded view to the main container
    mainContainer.appendChild(expandedView);
  } catch (error) {
    console.error('Error rendering expanded view:', error);
    renderNormalGrid();
  }
}

// Render a screen share in full-screen mode
function renderScreenShareFullScreen(participantId, isAdminControlled = false) {
  try {
    const screenShareInfo = ParticipantManager.screenShares.get(participantId);
    if (!screenShareInfo) {
      console.warn('Screen share full screen: Screen share not found, reverting to normal view');
      localViewState.isScreenShareFullScreen = false;
      localViewState.screenShareParticipantId = null;
      renderNormalGrid();
      return;
    }
    
    const { participant, track } = screenShareInfo;
    const participantInfo = ParticipantManager.participants.get(participantId);
    const isAdmin = participantInfo && participantInfo.isAdmin;
    
    // Clear the main container first
    mainContainer.innerHTML = '';
    
    // Create screen share container
    const screenShareContainer = document.createElement('div');
    screenShareContainer.className = 'screen-share-fullscreen flex h-full';
    
    // Create sidebar for participants
    const sidebar = document.createElement('div');
    sidebar.className = 'sidebar flex flex-col overflow-y-auto w-48 mr-2';
    
    // Create main content area for the screenshare
    const mainScreen = document.createElement('div');
    mainScreen.className = 'main-content flex-grow relative';
    
    // Add admin control indicator if needed
    if (isAdminControlled) {
      const adminIndicator = document.createElement('div');
      adminIndicator.className = 'lk-admin-control-indicator absolute top-4 left-4 bg-purple-700 text-white px-3 py-2 rounded-md z-50';
      adminIndicator.textContent = `Admin controlled screen share`;
      mainScreen.appendChild(adminIndicator);
    }
    
    // Add screen share video
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.className = 'w-full h-full object-contain';
    track.attach(video);
    mainScreen.appendChild(video);
    
    // Add presenter info
    const presenterInfo = document.createElement('div');
    presenterInfo.className = 'absolute top-4 left-4 bg-gray-800 bg-opacity-75 text-white px-3 py-2 rounded-md';
    presenterInfo.textContent = `${participantId}'s screen`;
    if (isAdminControlled) {
      // Position below admin indicator
      presenterInfo.className = 'absolute top-16 left-4 bg-gray-800 bg-opacity-75 text-white px-3 py-2 rounded-md';
    }
    mainScreen.appendChild(presenterInfo);
    
    // Add all participants to sidebar
    for (const [id, info] of ParticipantManager.participants.entries()) {
      const sidebarTile = document.createElement('div');
      sidebarTile.className = 'sidebar-tile relative h-32 mb-2';
      
      createParticipantTile(info.participant, info.isLocal, 'h-full', info.isAdmin, false, sidebarTile);
      
      sidebar.appendChild(sidebarTile);
    }
    
    // Add other screenshares to sidebar (excluding the current fullscreen one)
    for (const [id, info] of ParticipantManager.screenShares.entries()) {
      if (id !== participantId) {  // Skip the current fullscreen screenshare
        const sidebarTile = document.createElement('div');
        sidebarTile.className = 'sidebar-tile relative h-32 mb-2';
        
        // Create thumbnail for screenshare
        const videoThumb = document.createElement('video');
        videoThumb.autoplay = true;
        videoThumb.muted = true;
        videoThumb.playsInline = true;
        videoThumb.className = 'w-full h-full object-contain';
        info.track.attach(videoThumb);
        sidebarTile.appendChild(videoThumb);
        
        // Add screenshare label
        const label = document.createElement('div');
        label.className = 'absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-70 p-2 text-white text-sm';
        label.textContent = `${id}'s Screen`;
        sidebarTile.appendChild(label);
        
        // Add click handler to switch to this screenshare fullscreen
        sidebarTile.addEventListener('click', () => {
          toggleScreenShareFullScreen(id);
        });
        
        sidebar.appendChild(sidebarTile);
      }
    }
    
    // Add close button to return to normal view
    const closeButton = document.createElement('button');
    closeButton.className = 'absolute top-4 right-4 bg-gray-800 text-white p-2 rounded-md z-50';
    closeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    closeButton.addEventListener('click', () => {
      if (isAdminControlled && ParticipantManager.isCurrentUserAdmin()) {
        // Admin releasing control
        ParticipantManager.setAdminViewState('normal');
        broadcastAdminViewState({ viewMode: 'normal' });
      } else if (!isAdminControlled) {
        // Regular user closing their full-screen view
        localViewState.isScreenShareFullScreen = false;
        localViewState.screenShareParticipantId = null;
      }
      updateGrid();
    });
    mainScreen.appendChild(closeButton);
    
    // Append sidebar and main content to container
    screenShareContainer.appendChild(sidebar);
    screenShareContainer.appendChild(mainScreen);
    
    // Add the container to the main container
    mainContainer.appendChild(screenShareContainer);
  } catch (error) {
    console.error('Error rendering screen share full screen:', error);
    renderNormalGrid();
  }
}

// Helper function to clear main container and remove event listeners
function clearMainContainer() {
  try {
    // Get all elements with event listeners
    const elementsWithListeners = mainContainer.querySelectorAll(
      '.expand-button, .screen-fullscreen-toggle, .admin-control-button, .sidebar-tile'
    );
    
    // Clean up each element
    elementsWithListeners.forEach(cleanupElement);
    
    // Now clear the container
    mainContainer.innerHTML = '';
  } catch (error) {
    console.error('Error clearing main container:', error);
    // Fallback to direct clear
    mainContainer.innerHTML = '';
  }
}

// Helper to cleanup elements with event listeners
function cleanupElement(element) {
  try {
    // Clone the element without event listeners
    const clone = element.cloneNode(true);
    // Replace the original with the clone
    if (element.parentNode) {
      element.parentNode.replaceChild(clone, element);
    }
  } catch (error) {
    console.error('Error cleaning up element:', error);
  }
}

// Helper to detach media tracks from video/audio elements
function detachMediaTracks() {
  try {
    // Find all video and audio elements in the container
    const mediaElements = mainContainer.querySelectorAll('video, audio');
    
    mediaElements.forEach(element => {
      // Pause the element first
      if (element.pause) {
        element.pause();
      }
      
      // Remove the srcObject
      if (element.srcObject) {
        element.srcObject = null;
      }
    });
  } catch (error) {
    console.error('Error detaching media tracks:', error);
  }
}

// Toggle expanded view for a participant
function toggleExpandedView(participantId) {
  try {
    const isCurrentlyExpanded = localViewState.isExpandedView && 
                                localViewState.expandedParticipantId === participantId;
    
    // If admin, broadcast this change
    if (ParticipantManager.isCurrentUserAdmin()) {
      // Update admin view state
      if (isCurrentlyExpanded) {
        // If already expanded, toggle back to normal view
        ParticipantManager.setAdminViewState('normal');
        broadcastAdminViewState({ viewMode: 'normal' });
      } else {
        // Toggle to expanded view
        ParticipantManager.setAdminViewState('expanded', participantId);
        broadcastAdminViewState({ 
          viewMode: 'expanded', 
          targetParticipantId: participantId 
        });
      }
    } else {
      // Regular user toggle
      if (isCurrentlyExpanded) {
        // If already expanded, toggle back to normal view
        localViewState.isExpandedView = false;
        localViewState.expandedParticipantId = null;
      } else {
        // Toggle to expanded view
        localViewState.isExpandedView = true;
        localViewState.expandedParticipantId = participantId;
        // Reset screen share full screen if active
        localViewState.isScreenShareFullScreen = false;
        localViewState.screenShareParticipantId = null;
      }
    }
    
    // Update the UI
    updateGrid();
  } catch (error) {
    console.error('Error toggling expanded view:', error);
  }
}

// Toggle full-screen screen share
function toggleScreenShareFullScreen(participantId) {
  try {
    const isCurrentlyFullScreen = localViewState.isScreenShareFullScreen && 
                                 localViewState.screenShareParticipantId === participantId;
    
    // If admin, broadcast this change
    if (ParticipantManager.isCurrentUserAdmin()) {
      // Update admin view state
      if (isCurrentlyFullScreen) {
        // If already full screen, toggle back to normal view
        ParticipantManager.setAdminViewState('normal');
        broadcastAdminViewState({ viewMode: 'normal' });
      } else {
        // Toggle to full screen screen share
        ParticipantManager.setAdminViewState('screenShareFullScreen', participantId);
        broadcastAdminViewState({ 
          viewMode: 'screenShareFullScreen', 
          targetParticipantId: participantId 
        });
      }
    } else {
      // Regular user toggle
      if (isCurrentlyFullScreen) {
        // If already full screen, toggle back to normal view
        localViewState.isScreenShareFullScreen = false;
        localViewState.screenShareParticipantId = null;
      } else {
        // Toggle to full screen screen share
        localViewState.isScreenShareFullScreen = true;
        localViewState.screenShareParticipantId = participantId;
        // Reset expanded view if active
        localViewState.isExpandedView = false;
        localViewState.expandedParticipantId = null;
      }
    }
    
    // Update the UI
    updateGrid();
  } catch (error) {
    console.error('Error toggling screen share full screen:', error);
  }
}

// Function to determine grid columns class based on participant count
function getGridClassName(count) {
  const videoGrid = document.getElementById('videoGrid');
  if (!videoGrid) return;

  // Clear existing grid classes first
  videoGrid.className = videoGrid.className.replace(/grid-cols-\d+/g, '');

  // Always add mobile-grid class for mobile screens
  // The media query in CSS will handle when to apply it
  videoGrid.classList.add('mobile-grid');

  // Standard grid classes for desktop view
  // (These will be overridden by CSS media queries on mobile)
  if (count === 1) {
    console.log('Setting grid to 1 column for participant count:', count);
    videoGrid.classList.add('grid-cols-1');
  } else if (count === 2) {
    console.log('Setting grid to 2 columns for participant count:', count);
    videoGrid.classList.add('grid-cols-2');
  } else if (count <= 4) {
    console.log('Setting grid to 2 columns for participant count:', count);
    videoGrid.classList.add('grid-cols-2');
  } else if (count <= 9) {
    console.log('Setting grid to 3 columns for participant count:', count);
    videoGrid.classList.add('grid-cols-3');
  } else if (count <= 16) {
    console.log('Setting grid to 4 columns for participant count:', count);
    videoGrid.classList.add('grid-cols-4');
  } else {
    console.log('Setting grid to 5 columns for participant count:', count);
    videoGrid.classList.add('grid-cols-5');
  }
}

// Function to determine tile height based on participant count
function getTileHeight(count) {
  // Always add mobile-tile class which will be applied by CSS media query
  // when on mobile screens
  const isMobile = window.innerWidth <= 600;
  
  if (isMobile) {
    return 'mobile-tile';
  }

  // Regular height classes for desktop
  if (count <= 2) return 'stretch-container';
  if (count <= 4) return 'h-64';
  if (count <= 9) return 'h-48';
  if (count <= 16) return 'h-40';
  return 'h-32';
}

// Setup window resize event listener to update tile layout
window.addEventListener('resize', debounce(() => {
  if (room) {
    // Use the robust participant counting system
    const participantCount = ParticipantManager.getParticipantCount();
    console.log("Resize detected, updating grid layout for participants:", participantCount);

    // Let the grid update itself
    getGridClassName(participantCount);

    // Update height classes
    const tileHeight = getTileHeight(participantCount);
    const tiles = document.querySelectorAll('[id^="participant-"]');
    tiles.forEach(tile => {
      tile.classList.remove('stretch-container', 'h-64', 'h-48', 'h-40', 'h-32');
      tile.classList.add(tileHeight);

      // Always add mobile-tile class, will only apply on mobile via CSS
      if (!tile.classList.contains('mobile-tile')) {
        tile.classList.add('mobile-tile');
      }
    });
  }
}, 250)); // Debounce resize events to avoid excessive updates

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
// TODO ensure this works on expand mode tile.
function highlightActiveSpeakers(speakers) {
  // Reset all participant tiles
  const allTiles = videoGrid.querySelectorAll('[id^="participant-"]');
  allTiles.forEach(tile => {
    tile.classList.remove('border-2', 'border-yellow-500');
  });
  
  // Highlight active speakers
  speakers.forEach(speaker => {
    const tile = document.getElementById(`participant-${speaker.identity}`);
    if (tile) {
      tile.classList.add('border-2', 'border-yellow-500');
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
      break;
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

// Helper function to get a reliable participant count
function getRealParticipantCount() {
  if (!room) return 1;
  
  // Count participants in various ways to get the most accurate count
  let count = 1; // Start with 1 for local participant
  
  try {
    // Method 1: Use participants map
    if (room.participants instanceof Map) {
      count = room.participants.size + 1;
    }
    // Method 2: Count remote participants (most reliable for synchronization)
    else if (room.remoteParticipants) {
      if (room.remoteParticipants instanceof Map) {
        count = room.remoteParticipants.size + 1;
      } else if (Array.isArray(room.remoteParticipants)) {
        count = room.remoteParticipants.length + 1;
      } else if (typeof room.remoteParticipants === 'object') {
        count = Object.keys(room.remoteParticipants).length + 1;
      }
    }
    // Method 3: Check state
    else if (room._state && room._state.participants) {
      // Count all participants in the state
      count = Object.keys(room._state.participants).length;
    }
    
    // Check if we have participant elements in the DOM as a fallback
    const participantElements = document.querySelectorAll('[id^="participant-"]');
    if (participantElements.length > count) {
      count = participantElements.length;
    }
    
    console.log('Calculated participant count:', count);
    return count;
  } catch (e) {
    console.error('Error calculating participant count:', e);
    return Math.max(1, count);
  }
}

// Get a LiveKit token for authentication
async function getToken(username, roomName) {
  try {
    const isAdmin = determineIfAdmin(username);
    console.log('Getting token for user:', username, 'room:', roomName, 'isAdmin:', isAdmin);
    
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
    
    // Update server URL if provided
    if (url) {
      serverUrl = url;
    }
    
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
    
    // Set current room
    currentRoom = roomName;
    
    console.log('Token acquired for room:', roomName, 'isAdmin:', isAdmin);
    
    return token;
  } catch (error) {
    console.error('Error getting token:', error);
    showToast('Failed to get access token: ' + (error.message || 'Unknown error'));
    throw error;
  }
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = null;
      func.apply(context, args);
    }, wait);
  };
}

// Helper function to determine if a username should have admin privileges
function determineIfAdmin(username) {
  // List of admin usernames (for testing purposes)
  const adminUsernames = [
    'admin',
    'moderator',
    'host',
    'teacher',
    'instructor'
  ];
  
  // Check if username is in the admin list (case insensitive)
  return adminUsernames.some(admin => 
    username.toLowerCase() === admin.toLowerCase() ||
    username.toLowerCase().startsWith(admin.toLowerCase() + '-') ||
    username.toLowerCase().endsWith('-' + admin.toLowerCase())
  );
}

// Setup LiveKit data channel for admin controls
function setupAdminDataChannel() {
  try {
    if (!room) {
      console.error('Cannot setup admin data channel: Room not initialized');
      return;
    }
    
    console.log('Setting up admin data channel');
    
    // Store a flag to prevent duplicate listeners
    if (room._adminDataChannelSetup) {
      console.log('Admin data channel already set up');
      return;
    }
    
    // Create a handler function for data channel messages
    const handleDataChannelMessage = (payload, participant, kind) => {
      // Only process data channel messages
      if (kind !== LivekitClient.DataPacket_Kind.RELIABLE) return;
      
      try {
        // Parse the message
        const data = JSON.parse(new TextDecoder().decode(payload));
        
        // Check if this is an admin control message
        if (data && data.type === 'admin-control' && data.adminViewState) {
          console.log('Received admin control message:', data);
          handleAdminControlMessage(data, participant);
        }
      } catch (parseError) {
        console.error('Error parsing data channel message:', parseError);
      }
    };
    
    // Store the handler and add the listener
    room._adminDataHandler = handleDataChannelMessage;
    room.on(LivekitClient.RoomEvent.DataReceived, room._adminDataHandler);
    
    // Mark as set up
    room._adminDataChannelSetup = true;
    
    console.log('Admin data channel setup complete');
  } catch (error) {
    console.error('Error setting up admin data channel:', error);
  }
}

// Handle incoming admin control messages
function handleAdminControlMessage(data, sender) {
  try {
    // Validate input parameters
    if (!data || !sender) {
      console.warn('Invalid data or sender in admin control message');
      return;
    }
    
    // Verify sender is an admin
    const senderInfo = ParticipantManager.participants.get(sender.identity);
    if (!senderInfo || !senderInfo.isAdmin) {
      console.warn('Received admin control message from non-admin user:', sender.identity);
      return;
    }
    
    // Validate admin state data
    const adminState = data.adminViewState;
    if (!adminState || !adminState.viewMode || !adminState.timestamp) {
      console.warn('Invalid admin state data:', adminState);
      return;
    }
    
    // Only accept newer state updates
    if (ParticipantManager.adminViewState.timestamp >= adminState.timestamp) {
      console.log('Ignoring outdated admin state update');
      return;
    }
    
    // Update admin view state with validated data
    ParticipantManager.adminViewState = {
      viewMode: adminState.viewMode,
      targetParticipantId: adminState.targetParticipantId || null,
      adminIdentity: sender.identity,
      timestamp: adminState.timestamp
    };
    
    // Update local state to reflect admin control
    localViewState.adminOverride = (adminState.viewMode !== 'normal');
    
    // Show toast notification
    if (adminState.viewMode === 'normal') {
      showToast(`Admin ${sender.identity} released control`);
    } else {
      showToast(`Admin ${sender.identity} is controlling the view`);
    }
    
    // Update the UI
    updateGrid();
  } catch (error) {
    console.error('Error handling admin control message:', error, 'data:', data);
    
    // Fallback - reset to normal view if error occurs
    try {
      localViewState.adminOverride = false;
      updateGrid();
    } catch (fallbackError) {
      console.error('Failed to reset view after admin control error:', fallbackError);
    }
  }
}

// Broadcast admin view state to all participants
function broadcastAdminViewState(adminViewState) {
  try {
    // Input validation
    if (!adminViewState || !adminViewState.viewMode) {
      console.error('Invalid admin view state for broadcast:', adminViewState);
      return false;
    }
    
    if (!room || !room.localParticipant) {
      console.error('Cannot broadcast admin state: Room not connected');
      return false;
    }
    
    // Verify current user is admin
    if (!ParticipantManager.isCurrentUserAdmin()) {
      console.warn('Non-admin user attempted to broadcast admin state');
      return false;
    }
    
    // Prepare the message with validated data
    const message = {
      type: 'admin-control',
      adminViewState: {
        viewMode: adminViewState.viewMode,
        targetParticipantId: adminViewState.targetParticipantId || null,
        adminIdentity: room.localParticipant.identity,
        timestamp: Date.now()  // Use fresh timestamp for broadcast
      }
    };
    
    try {
      // Convert to binary data
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(message));
      
      // Send to all participants
      room.localParticipant.publishData(data, LivekitClient.DataPacket_Kind.RELIABLE);
      
      console.log('Admin view state broadcasted:', message.adminViewState);
      
      // Update local state
      localViewState.adminOverride = (adminViewState.viewMode !== 'normal');
      
      return true;
    } catch (publishError) {
      console.error('Error publishing admin control data:', publishError);
      return false;
    }
  } catch (error) {
    console.error('Error broadcasting admin view state:', error);
    return false;
  }
}

// Function to render screen shares in the normal grid view
function renderScreenSharesInGrid() {
  for (const [identity, info] of ParticipantManager.screenShares.entries()) {
    const { participant, track } = info;
    const participantInfo = ParticipantManager.participants.get(identity);
    const isAdmin = participantInfo && participantInfo.isAdmin;
    
    // Get the same height class used for participant tiles
    const count = getRealParticipantCount();
    const heightClass = getTileHeight(count);
    
    // Create screen share tile
    const tile = document.createElement('div');
    tile.id = `screen-${identity}`;
    tile.className = `screen-share-tile bg-gray-800 rounded-lg ${heightClass} relative overflow-hidden`;
    videoGrid.appendChild(tile);
    
    // Create video element for the screen share
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.className = 'w-full h-full object-contain';
    track.attach(video);
    tile.appendChild(video);
    
    // Create info bar at the bottom
    const infoBar = document.createElement('div');
    infoBar.className = 'absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-70 p-2 flex justify-between items-center';
    
    // Screen share label
    const label = document.createElement('span');
    label.className = 'text-white text-sm';
    label.textContent = `${identity}'s Screen`;
    if (isAdmin) {
      label.innerHTML = `${identity}'s Screen <span class="lk-admin-star ml-1 text-yellow-400">★</span>`;
    }
    infoBar.appendChild(label);
    
    // Add the info bar to the tile
    tile.appendChild(infoBar);
    
    // Full screen toggle button in top-right corner (matching participant tiles)
    const fullScreenToggle = document.createElement('button');
    fullScreenToggle.className = 'screen-fullscreen-toggle text-white p-1 bg-gray-700 hover:bg-gray-600 rounded absolute top-2 right-2 z-10';
    fullScreenToggle.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 3 21 3 21 9"></polyline>
        <polyline points="9 21 3 21 3 15"></polyline>
        <line x1="21" y1="3" x2="14" y2="10"></line>
        <line x1="3" y1="21" x2="10" y2="14"></line>
      </svg>
    `;
    fullScreenToggle.addEventListener('click', () => {
      toggleScreenShareFullScreen(identity);
    });
    tile.appendChild(fullScreenToggle);
    
    // Only show admin control for admins (in the info bar)
    if (ParticipantManager.isCurrentUserAdmin()) {
      const adminControlButton = document.createElement('button');
      adminControlButton.className = 'admin-control-button text-white p-1 bg-purple-700 hover:bg-purple-600 rounded ml-1';
      adminControlButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>';
      adminControlButton.title = "Control this screen share for all participants";
      adminControlButton.addEventListener('click', () => {
        // Toggle admin control of screen share
        ParticipantManager.setAdminViewState('screenShareFullScreen', identity);
        broadcastAdminViewState({ 
          viewMode: 'screenShareFullScreen', 
          targetParticipantId: identity 
        });
        updateGrid();
      });
      infoBar.appendChild(adminControlButton);
    }
  }
}

// Create a participant tile
function createParticipantTile(participant, isLocal, heightClass, isAdmin = false, isExpanded = false, customContainer = null) {
  try {
    // Create the tile element
    const tile = document.createElement('div');
    tile.id = `participant-${participant.identity}`;

    // Apply appropriate classes
    const speakerClass = participant.speaking ? 'active-speaker' : '';
    tile.className = `bg-gray-800 rounded-lg ${heightClass} participant-box ${speakerClass} relative`;
    
    // Create video container
    const videoContainer = document.createElement('div');
    videoContainer.className = 'absolute inset-0 overflow-hidden';
    tile.appendChild(videoContainer);
    
    // Add the tile to the container (either videoGrid or a custom container)
    if (customContainer) {
      customContainer.appendChild(tile);
    } else {
      videoGrid.appendChild(tile);
    }
    
    // Attach video track if available
    const videoPublication = participant.getTrackPublication(LivekitClient.Track.Source.Camera);
    if (videoPublication && videoPublication.track && !videoPublication.isMuted) {
      const videoElement = videoPublication.track.attach();
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.className = 'w-full h-full object-contain';
      
      // If this is the local participant, mirror the video
      if (isLocal) {
        videoElement.style.transform = 'scaleX(-1)';
      }
      
      videoContainer.appendChild(videoElement);
    } else {
      // If no video, show avatar or initials
      const avatar = document.createElement('div');
      avatar.className = 'w-full h-full flex items-center justify-center bg-gray-800 text-white text-4xl font-bold';
      avatar.textContent = participant.identity.charAt(0).toUpperCase();
      videoContainer.appendChild(avatar);
    }
    
    // Create info bar
    const infoBar = document.createElement('div');
    infoBar.className = 'absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-70 p-2 flex justify-between items-center z-10';
    
    // Participant name with admin star if applicable
    const nameOverlay = document.createElement('span');
    nameOverlay.className = 'text-white text-sm';
    
    // Add admin star next to admin names
    if (isAdmin) {
      nameOverlay.innerHTML = `${isLocal ? participant.identity + ' (You)' : participant.identity} <span class="lk-admin-star ml-1 text-yellow-400">★</span>`;
    } else {
      nameOverlay.textContent = isLocal ? `${participant.identity} (You)` : participant.identity;
    }
    infoBar.appendChild(nameOverlay);
    
    // Indicators container
    const indicators = document.createElement('div');
    indicators.className = 'flex items-center gap-2';
    
    // Audio indicator
    const audioIndicator = document.createElement('div');
    audioIndicator.className = 'h-4 w-4 rounded-full bg-red-500';
    audioIndicator.id = `audio-indicator-${participant.identity}`;
    
    // Update audio indicator based on track state
    const audioPublication = participant.getTrackPublication(LivekitClient.Track.Source.Microphone);
    if (audioPublication && !audioPublication.isMuted) {
      audioIndicator.classList.add('bg-green-500');
      audioIndicator.classList.remove('bg-red-500');
    }
    
    indicators.appendChild(audioIndicator);
    
    // Add expand button if not already expanded
    if (!isExpanded) {
      const expandButton = document.createElement('button');
      expandButton.className = 'expand-button text-white p-1 bg-gray-700 hover:bg-gray-600 rounded absolute top-2 right-2 z-10';
      expandButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 3 21 3 21 9"></polyline>
          <polyline points="9 21 3 21 3 15"></polyline>
          <line x1="21" y1="3" x2="14" y2="10"></line>
          <line x1="3" y1="21" x2="10" y2="14"></line>
        </svg>
      `;
      expandButton.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleExpandedView(participant.identity);
      });
      tile.appendChild(expandButton); // Append directly to the tile instead of indicators
    }
    
    // Add admin control button for admins
    if (ParticipantManager.isCurrentUserAdmin() && !isLocal) {
      const adminControlButton = document.createElement('button');
      adminControlButton.className = 'admin-control-button text-white p-1 bg-purple-700 hover:bg-purple-600 rounded ml-1';
      adminControlButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>';
      adminControlButton.title = "Make this view visible to all participants";
      adminControlButton.addEventListener('click', (event) => {
        event.stopPropagation();
        // Toggle admin control of participant view
        ParticipantManager.setAdminViewState('expanded', participant.identity);
        broadcastAdminViewState({
          viewMode: 'expanded',
          targetParticipantId: participant.identity
        });
        updateGrid();
      });
      indicators.appendChild(adminControlButton);
    }
    
    infoBar.appendChild(indicators);
    tile.appendChild(infoBar);
    
    return tile;
  } catch (error) {
    console.error('Error creating participant tile:', error);
    return null;
  }
}

// Update a single participant tile without rebuilding the entire grid
function updateParticipantTile(participant, trackKind) {
  try {
    if (!participant) return false;
    
    console.log(`Updating specific tile for ${participant.identity}, track kind: ${trackKind}`);
    
    // Find the existing participant tile
    const tileId = `participant-${participant.identity}`;
    const existingTile = document.getElementById(tileId);
    
    if (!existingTile) {
      console.log(`Tile for ${participant.identity} not found, skipping targeted update`);
      return false;
    }
    
    // Find the elements we need to update
    const videoContainer = existingTile.querySelector('.video-container');
    const audioIcon = existingTile.querySelector('.mic-status');
    const videoIcon = existingTile.querySelector('.camera-status');
    
    if (!videoContainer || !audioIcon || !videoIcon) {
      console.log(`Required elements not found in tile ${tileId}, skipping targeted update`);
      return false;
    }
    
    // Update only what changed
    if (trackKind === 'audio' || trackKind === 'all') {
      // Update audio status
      const isAudioMuted = !participant.audioTrack || participant.audioTrack.isMuted;
      audioIcon.innerHTML = isAudioMuted ? 
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>' : 
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
      
      // Update audio element if needed
      const audioTrack = participant.audioTrack?.mediaTrack;
      if (audioTrack) {
        let audioElement = existingTile.querySelector('audio');
        if (!audioElement) {
          audioElement = document.createElement('audio');
          audioElement.autoplay = true;
          audioElement.id = `audio-${participant.identity}`;
          existingTile.appendChild(audioElement);
        }
        
        // Only replace if the track changed
        if (audioElement.srcObject !== audioTrack) {
          audioElement.srcObject = new MediaStream([audioTrack]);
        }
      }
    }
    
    if (trackKind === 'video' || trackKind === 'all') {
      // Update video status
      const isVideoMuted = !participant.videoTrack || participant.videoTrack.isMuted;
      videoIcon.innerHTML = isVideoMuted ? 
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M15.24 2.58L22 4.54v14.91L15.24 21.4"></path><path d="M8.34 4.54a3 3 0 0 1 4.32 0L16 8.09v7.81l-3.91 3.83a3 3 0 0 1-4.32 0L4 15.9V8.09l4.34-3.55z"></path></svg>' : 
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>';
      
      // Update video element
      let videoElement = videoContainer.querySelector('video');
      
      if (isVideoMuted) {
        // If video is muted, show avatar instead
        videoContainer.classList.add('bg-gray-800');
        if (videoElement) {
          videoElement.style.display = 'none';
        }
        
        // Show avatar/initials
        let avatarElement = videoContainer.querySelector('.avatar');
        if (!avatarElement) {
          avatarElement = document.createElement('div');
          avatarElement.className = 'avatar flex items-center justify-center h-full';
          
          const initials = participant.identity.substring(0, 2).toUpperCase();
          avatarElement.innerHTML = `<div class="text-2xl font-bold text-white">${initials}</div>`;
          videoContainer.appendChild(avatarElement);
        }
      } else {
        // If video is enabled, show video
        videoContainer.classList.remove('bg-gray-800');
        
        // Remove avatar if it exists
        const avatarElement = videoContainer.querySelector('.avatar');
        if (avatarElement) {
          avatarElement.remove();
        }
        
        // Add or update video element
        const videoTrack = participant.videoTrack?.mediaTrack;
        if (videoTrack) {
          if (!videoElement) {
            videoElement = document.createElement('video');
            videoElement.autoplay = true;
            videoElement.playsInline = true;
            videoElement.id = `video-${participant.identity}`;
            videoElement.className = 'w-full h-full object-cover';
            videoContainer.appendChild(videoElement);
          } else {
            videoElement.style.display = 'block';
          }
          
          // Only replace if the track changed
          if (videoElement.srcObject !== videoTrack) {
            videoElement.srcObject = new MediaStream([videoTrack]);
          }
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error updating participant tile:', error);
    return false;
  }
}

// Update a single screenshare tile without rebuilding the entire grid
function updateScreenShareTile(participant, track, isActive) {
  try {
    if (!participant) return false;
    
    console.log(`Updating specific screenshare for ${participant.identity}, active: ${isActive}`);
    
    // Find the existing screenshare tile
    const tileId = `screen-${participant.identity}`;
    const existingTile = document.getElementById(tileId);
    
    if (isActive && track) {
      if (existingTile) {
        // Update existing tile
        const videoContainer = existingTile.querySelector('.video-container');
        if (videoContainer) {
          let videoElement = videoContainer.querySelector('video');
          if (!videoElement) {
            videoElement = document.createElement('video');
            videoElement.autoplay = true;
            videoElement.muted = true;
            videoElement.playsInline = true;
            videoElement.className = 'w-full h-full object-contain';
            videoContainer.appendChild(videoElement);
          }
          
          // Replace track
          if (videoElement.srcObject !== track.mediaTrack) {
            videoElement.srcObject = new MediaStream([track.mediaTrack]);
          }
        }
      } else {
        // If tile doesn't exist, we need to create it via grid update
        return false;
      }
    } else if (existingTile) {
      // Remove the tile
      existingTile.remove();
    }
    
    return true;
  } catch (error) {
    console.error('Error updating screenshare tile:', error);
    return false;
  }
}

// Export objects and functions for testing purposes
// Only used in test environment
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    ParticipantManager,
    determineIfAdmin,
    handleAdminControlMessage,
    broadcastAdminViewState,
    setupAdminDataChannel,
    joinRoom
  };
}
