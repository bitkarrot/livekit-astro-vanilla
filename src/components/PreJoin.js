// This script handles the PreJoin component UI
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const videoPreview = document.getElementById('video-preview');
  const microphoneToggle = document.getElementById('microphone-toggle');
  const microphoneDropdownBtn = document.getElementById('microphone-dropdown-button');
  const microphoneDropdown = document.getElementById('microphone-dropdown');
  const cameraToggle = document.getElementById('camera-toggle');
  const cameraDropdownBtn = document.getElementById('camera-dropdown-button');
  const cameraDropdown = document.getElementById('camera-dropdown');
  const usernameInput = document.getElementById('username');
  const joinBtn = document.getElementById('join-btn');
  
  // State
  let localStream = null;
  // Initialize from localStorage if available
  let videoEnabled = localStorage.getItem('livekit-video-enabled') === 'false' ? false : true;
  let audioEnabled = localStorage.getItem('livekit-audio-enabled') === 'false' ? false : true;
  let selectedAudioDevice = localStorage.getItem('livekit-audio-device') || null;
  let selectedVideoDevice = localStorage.getItem('livekit-video-device') || null;
  
  // Pre-fill username if available
  const savedUsername = localStorage.getItem('livekit-username');
  if (savedUsername && usernameInput) {
    usernameInput.value = savedUsername;
  }
  
  // Initialize preview
  initializeDevicePreview();
  
  // Toggle microphone
  microphoneToggle.addEventListener('click', () => {
    audioEnabled = !audioEnabled;
    updateMicrophoneState();
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = audioEnabled;
      });
    }
  });
  
  // Toggle camera
  cameraToggle.addEventListener('click', () => {
    videoEnabled = !videoEnabled;
    updateCameraState();
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = videoEnabled;
      });
    }
  });
  
  // Toggle dropdowns
  microphoneDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    microphoneDropdown.classList.toggle('hidden');
    if (!cameraDropdown.classList.contains('hidden')) {
      cameraDropdown.classList.add('hidden');
    }
  });
  
  cameraDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    cameraDropdown.classList.toggle('hidden');
    if (!microphoneDropdown.classList.contains('hidden')) {
      microphoneDropdown.classList.add('hidden');
    }
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.device-control')) {
      microphoneDropdown.classList.add('hidden');
      cameraDropdown.classList.add('hidden');
    }
  });
  
  // Update UI to reflect state
  function updateMicrophoneState() {
    if (audioEnabled) {
      microphoneToggle.classList.remove('disabled');
    } else {
      microphoneToggle.classList.add('disabled');
    }
  }
  
  function updateCameraState() {
    if (videoEnabled) {
      cameraToggle.classList.remove('disabled');
    } else {
      cameraToggle.classList.add('disabled');
    }
  }
  
  // Initialize device preview
  async function initializeDevicePreview() {
    try {
      // Request permissions and get devices
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      // Populate device dropdowns
      populateDeviceDropdowns(devices);
      
      // Start preview with default devices
      startMediaPreview();
    } catch (error) {
      console.error('Error initializing device preview:', error);
      const permissionsWarning = document.getElementById('permissions-warning');
      if (permissionsWarning) {
        permissionsWarning.classList.remove('hidden');
      }
    }
  }
  
  // Populate device dropdowns
  function populateDeviceDropdowns(devices) {
    const audioInputs = devices.filter(device => device.kind === 'audioinput');
    const videoInputs = devices.filter(device => device.kind === 'videoinput');
    
    // Populate audio dropdown
    microphoneDropdown.innerHTML = '';
    audioInputs.forEach(device => {
      const button = document.createElement('button');
      button.textContent = device.label || `Microphone ${audioInputs.indexOf(device) + 1}`;
      button.dataset.deviceId = device.deviceId;
      button.addEventListener('click', () => {
        selectedAudioDevice = device.deviceId;
        startMediaPreview();
        microphoneDropdown.classList.add('hidden');
        
        // Update active state
        microphoneDropdown.querySelectorAll('button').forEach(btn => {
          btn.classList.remove('active');
        });
        button.classList.add('active');
      });
      
      // Mark as active if it's the current device
      if (device.deviceId === selectedAudioDevice) {
        button.classList.add('active');
      }
      
      microphoneDropdown.appendChild(button);
    });
    
    // Populate video dropdown
    cameraDropdown.innerHTML = '';
    videoInputs.forEach(device => {
      const button = document.createElement('button');
      button.textContent = device.label || `Camera ${videoInputs.indexOf(device) + 1}`;
      button.dataset.deviceId = device.deviceId;
      button.addEventListener('click', () => {
        selectedVideoDevice = device.deviceId;
        startMediaPreview();
        cameraDropdown.classList.add('hidden');
        
        // Update active state
        cameraDropdown.querySelectorAll('button').forEach(btn => {
          btn.classList.remove('active');
        });
        button.classList.add('active');
      });
      
      // Mark as active if it's the current device
      if (device.deviceId === selectedVideoDevice) {
        button.classList.add('active');
      }
      
      cameraDropdown.appendChild(button);
    });
    
    // Set initial active device if none is selected
    if (!selectedAudioDevice && audioInputs.length > 0) {
      selectedAudioDevice = audioInputs[0].deviceId;
      const firstAudioButton = microphoneDropdown.querySelector('button');
      if (firstAudioButton) firstAudioButton.classList.add('active');
    }
    
    if (!selectedVideoDevice && videoInputs.length > 0) {
      selectedVideoDevice = videoInputs[0].deviceId;
      const firstVideoButton = cameraDropdown.querySelector('button');
      if (firstVideoButton) firstVideoButton.classList.add('active');
    }
  }
  
  // Start media preview
  async function startMediaPreview() {
    try {
      // Stop any existing stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      // Create constraints
      const constraints = {
        audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true,
        video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true
      };
      
      // Get new stream
      localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Apply enabled/disabled state
      localStream.getAudioTracks().forEach(track => {
        track.enabled = audioEnabled;
      });
      
      localStream.getVideoTracks().forEach(track => {
        track.enabled = videoEnabled;
      });
      
      // Create video element if it doesn't exist
      let videoElement = videoPreview.querySelector('video');
      if (!videoElement) {
        videoElement = document.createElement('video');
        videoElement.autoplay = true;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoPreview.innerHTML = '';
        videoPreview.appendChild(videoElement);
      }
      
      // Attach stream to video element
      videoElement.srcObject = localStream;
    } catch (error) {
      console.error('Error starting media preview:', error);
      const permissionsWarning = document.getElementById('permissions-warning');
      if (permissionsWarning) {
        permissionsWarning.classList.remove('hidden');
      }
    }
  }
  
  // Add event listener for join button to save preferences to localStorage
  if (joinBtn) {
    joinBtn.addEventListener('click', () => {
      // Save device preferences to localStorage
      localStorage.setItem('livekit-audio-enabled', audioEnabled.toString());
      localStorage.setItem('livekit-video-enabled', videoEnabled.toString());
      localStorage.setItem('livekit-audio-device', selectedAudioDevice || '');
      localStorage.setItem('livekit-video-device', selectedVideoDevice || '');
      
      // Save username
      const username = usernameInput.value.trim();
      if (username) {
        localStorage.setItem('livekit-username', username);
      }
    });
  }
  
  // Initialize UI state
  updateMicrophoneState();
  updateCameraState();
});
