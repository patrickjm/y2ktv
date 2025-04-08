// Add type definitions for YouTube IFrame API
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: {
      Player: new (element: string | HTMLElement, options: any) => any;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
  }
}

import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import './App.css';
import { SHOWS } from './shows';

// Add at the top of the file (under other declarations)
const SEED = 1714550400; // Fixed seed date (2024-05-01 00:00:00 UTC)

// Define our channel types
interface PlaylistItem {
  id: string;
  duration: number; // Duration in seconds
}

interface Channel {
  id: number;
  name: string;
  playlist: PlaylistItem[];
  color: string;
}

function App() {
  const [currentChannel, setCurrentChannel] = useState<number>(0);
  const [videoId, setVideoId] = useState<string>('');
  const [isChangingChannel, setIsChangingChannel] = useState<boolean>(true);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(100);
  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [showCopiedMessage, setShowCopiedMessage] = useState<boolean>(false);
  const [isStaticVisible, setIsStaticVisible] = useState<boolean>(true); // Controls actual visibility
  const staticVideoRef = useRef<HTMLVideoElement | null>(null); // Ref for the video element
  
  // Get unique genres from shows
  const genres = [...new Set(SHOWS.map(show => show.g))];
  
  // Create channels based on genres
  const channels: Channel[] = genres.map((genre, index) => ({
    id: index,
    name: genre,
    playlist: SHOWS
      .filter(show => show.g === genre)
      .map(show => ({
        id: show.yt,
        duration: show.t
      })),
    color: `hsl(${(index * 360) / genres.length}, 70%, 50%)` // Generate different colors for each channel
  }));

  // Add this before the useEffect that calls it
  const determineVideoFromTime = useCallback(() => {
    const now = Date.now(); // Current UTC timestamp in milliseconds
    const totalSeconds = Math.floor((now - SEED) / 1000);

    const currentChannelData = channels[currentChannel];
    const totalPlaylistDuration = currentChannelData.playlist.reduce((sum, video) => sum + video.duration, 0);
    
    // Get current position in the endless cycle
    const currentCyclePosition = totalSeconds % totalPlaylistDuration;
    
    // Find current video and its start time in the cycle
    let accumulatedTime = 0;
    let currentVideoIndex = 0;
    let currentVideoStart = 0;
    
    for (let i = 0; i < currentChannelData.playlist.length; i++) {
      const video = currentChannelData.playlist[i];
      if (currentCyclePosition < accumulatedTime + video.duration) {
        currentVideoIndex = i;
        currentVideoStart = currentCyclePosition - accumulatedTime;
        break;
      }
      accumulatedTime += video.duration;
    }
    
    const nextVideoId = currentChannelData.playlist[currentVideoIndex].id;

    if (nextVideoId !== videoId) {
      setIsChangingChannel(true);
      setVideoId(nextVideoId);
      setCurrentTime(currentVideoStart);
      setVideoError(false);
    }
    // No need to setVideoError(false) if the video hasn't changed
    
  }, [currentChannel, channels, videoId]);

  // Then update the useEffect to use the memoized version
  useEffect(() => {
    const intervalId = setInterval(determineVideoFromTime, 60000);
    determineVideoFromTime(); // Initial call
    return () => clearInterval(intervalId);
  }, [determineVideoFromTime]); // Now depends on the memoized callback

  // Load YouTube API and initialize player
  useEffect(() => {
    // First, create a div for the player if it doesn't exist
    let playerElement = document.getElementById('youtube-player');
    if (!playerElement) {
      playerElement = document.createElement('div');
      playerElement.id = 'youtube-player';
      document.getElementById('youtube-container')?.appendChild(playerElement);
    }

    // Load the YouTube API if not already loaded
    if (!window.YT || typeof window.YT.Player !== 'function') {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      // Setup callback for when API is ready
      window.onYouTubeIframeAPIReady = initializePlayer;
    } else {
      // API already loaded, initialize player directly
      initializePlayer();
    }

    function initializePlayer() {
      if (!videoId) return;
      
      // Clean up existing player if any
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error("Error destroying player:", e);
        }
      }

      try {
        // Create new player
        playerRef.current = new window.YT.Player('youtube-player', {
          videoId: videoId,
          playerVars: {
            start: currentTime,
            autoplay: 1,
            controls: 0,
            showinfo: 0,
            modestbranding: 1,
            fs: 0,
            cc_load_policy: 0,
            mute: 1,
            playsinline: 1,
            disablekb: 1,
            enablejsapi: 1,
            iv_load_policy: 3,
            rel: 0,
            autohide: 1,
            color: 'white',
            widget_referrer: window.location.href,
            origin: window.location.hostname
          },
          events: {
            onReady: (event: any) => {
              playerReadyRef.current = true;
              event.target.setVolume(volume);
              if (!isMuted) {
                event.target.unMute();
              }
              
              // Set iframe attributes directly
              const iframe = document.querySelector('#youtube-player iframe');
              if (iframe) {
                // Set width and height attributes directly (similar to ytch example)
                iframe.setAttribute('width', '100%');
                iframe.setAttribute('height', '3000');
                
                // Set additional attributes that might help
                iframe.setAttribute('frameborder', '0');
                iframe.setAttribute('allowfullscreen', 'false');
              }
              
              // Center the tall iframe to hide YouTube branding/title
              adjustPlayerVerticalPosition();
              
              // Start playback with slight delay
              setTimeout(() => event.target.playVideo(), 500);
            },
            onError: handleVideoError,
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                setIsChangingChannel(false);
                adjustPlayerVerticalPosition(); // Adjust position when playing
              } else if (event.data === window.YT.PlayerState.ENDED) {
                determineVideoFromTime();
              }
            }
          }
        });
      } catch (e) {
        console.error("Error initializing YouTube player:", e);
        setVideoError(true);
        setIsChangingChannel(true); // Show static on error too
      }
    }

    // Cleanup function
    return () => {
      window.onYouTubeIframeAPIReady = () => {};
    };
  }, [videoId]);

  // Update player when volume changes
  useEffect(() => {
    if (playerRef.current && playerReadyRef.current) {
      try {
        playerRef.current.setVolume(volume);
      } catch (e) {
        console.error("Error setting volume:", e);
      }
    }
  }, [volume]);

  // Update player when mute state changes
  useEffect(() => {
    if (playerRef.current && playerReadyRef.current) {
      try {
        if (isMuted) {
          playerRef.current.mute();
        } else {
          playerRef.current.unMute();
        }
      } catch (e) {
        console.error("Error changing mute state:", e);
      }
    }
  }, [isMuted]);

  // Handle channel change
  const changeChannel = (direction: 'prev' | 'next') => {
    const totalChannels = channels.length;
    let nextChannel;
    
    if (direction === 'next') {
      nextChannel = (currentChannel + 1) % totalChannels;
    } else {
      nextChannel = (currentChannel - 1 + totalChannels) % totalChannels;
    }
    
    setIsChangingChannel(true);
    setVideoError(false);
    setCurrentChannel(nextChannel); // Change channel immediately, useEffect will handle the video update
  };

  // Try the next video if the current one fails
  const handleVideoError = () => {
    console.log('Video failed to load');
    setIsChangingChannel(true); // Show static
    setVideoError(true);
    
    // Find the next video in the current channel's playlist
    const currentPlaylist = channels[currentChannel].playlist;
    const currentIndex = currentPlaylist.findIndex(item => item.id === videoId);
    const nextIndex = (currentIndex + 1) % currentPlaylist.length;
    const nextVideoId = currentPlaylist[nextIndex].id;

    // If we've looped through all videos and they all failed, maybe switch channel?
    // For now, just try the next video ID
    if (nextVideoId !== videoId) {
      setVideoId(nextVideoId);
      setCurrentTime(0); // Start next video from the beginning
    } else {
      // If the next ID is the same (only 1 video or all failed), trigger channel change
      changeChannel('next');
    }
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt((e.target as HTMLInputElement).value);
    setVolume(newVolume);
  };

  // Handle mute/unmute
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Copy YouTube URL to clipboard
  const copyVideoUrl = () => {
    if (videoId) {
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      navigator.clipboard.writeText(youtubeUrl)
        .then(() => {
          setShowCopiedMessage(true);
          setTimeout(() => setShowCopiedMessage(false), 2000);
        })
        .catch(err => {
          console.error('Could not copy URL: ', err);
        });
    }
  };

  // Function to adjust the player's vertical position to center content and hide controls/branding
  const adjustPlayerVerticalPosition = useCallback(() => {
    try {
      const playerElement = document.getElementById('youtube-player');
      const container = document.getElementById('youtube-container');
      if (!playerElement || !container) return;

      // Set explicit dimensions
      playerElement.style.height = '3000px';
      const iframe = playerElement.querySelector('iframe');
      if (iframe) {
        iframe.setAttribute('height', '3000');
        iframe.style.height = '3000px';
      }

      // Center the content
      const containerHeight = container.clientHeight;
      playerElement.style.marginTop = `${(containerHeight - 3000) / 2}px`;
      
    } catch (e) {
      console.error("Error adjusting player position:", e);
    }
  }, []);

  // Add window resize listener to adjust player position when container size changes
  useEffect(() => {
    window.addEventListener('resize', adjustPlayerVerticalPosition);
    // Initial adjustment
    adjustPlayerVerticalPosition();
    
    return () => {
      window.removeEventListener('resize', adjustPlayerVerticalPosition);
    };
  }, [adjustPlayerVerticalPosition]);

  // Effect to manage static visibility and fade
  useEffect(() => {
    if (isChangingChannel || videoError) {
      setIsStaticVisible(true); // Show immediately
    } else {
      // Start fade out
      const videoElement = staticVideoRef.current;
      if (videoElement) {
        videoElement.classList.add('static-fade-out');
        
        // Remove the video element after fade out completes
        const handleTransitionEnd = () => {
          setIsStaticVisible(false);
          videoElement.classList.remove('static-fade-out');
          videoElement.removeEventListener('transitionend', handleTransitionEnd);
        };
        videoElement.addEventListener('transitionend', handleTransitionEnd);
      }
    }
  }, [isChangingChannel, videoError]);

  return (
    <div className="app-container">
      <div className="tv-set">
        <div className={`tv-screen ${isChangingChannel || videoError ? 'changing-channel' : ''}`}>
          <div className="channel-number">
            CH{currentChannel + 1}
          </div>
          
          {isStaticVisible && (
            <video 
              ref={staticVideoRef}
              className="tv-static-video" 
              src="/static.webm" 
              autoPlay 
              loop 
              muted
            />
          )}
          
          {/* YouTube container should always be present to hold the player */} 
          <div id="youtube-container" className="youtube-container" style={{ visibility: isStaticVisible ? 'hidden' : 'visible' }}></div>
          
          {!isStaticVisible && (
            <div className="scanline" />
          )}
          
        </div>
        <div className="tv-glow"></div>
        <div className="tv-base">
          <div className="tv-controls">
            <div className="tv-channel-buttons">
              <button 
                className="channel-button prev-channel" 
                onClick={() => changeChannel('prev')}
                aria-label="Previous Channel"
              >
                <span>◀</span>
              </button>
              <div className="channel-indicator">
                CH
              </div>
              <button 
                className="channel-button next-channel" 
                onClick={() => changeChannel('next')}
                aria-label="Next Channel"
              >
                <span>▶</span>
              </button>
            </div>
            <div className="tv-knobs">
              <div className="volume-control">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="volume-slider"
                />
                <div className="knob-label" style={{ top: '26px' }}>VOL</div>
              </div>
              <button 
                className={`mute-button ${isMuted ? 'muted' : ''}`}
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                <div className="mute-icon">
                  {isMuted ? "🔇" : "🔊"}
                </div>
                <div className="knob-label">{isMuted ? "UNMUTE" : "MUTE"}</div>
              </button>
              <button 
                className="copy-url-button"
                onClick={copyVideoUrl}
                aria-label="Copy URL"
              >
                <div className="copy-icon">
                  📋
                </div>
                <div className="knob-label">COPY URL</div>
                {showCopiedMessage && <div className="copied-message">Copied!</div>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
