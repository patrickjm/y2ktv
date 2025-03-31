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

import { useEffect, useRef, useState } from 'react';
import './App.css';

// Define our channel types
interface Channel {
  id: number;
  name: string;
  playlist: string[];
  color: string;
}

function App() {
  const [currentChannel, setCurrentChannel] = useState<number>(0);
  const [videoId, setVideoId] = useState<string>('');
  const [isChangingChannel, setIsChangingChannel] = useState<boolean>(false);
  const [showChannelInfo, setShowChannelInfo] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(100);
  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef<boolean>(false);
  
  // Our TV channels with 90s content
  const channels: Channel[] = [
    {
      id: 0,
      name: "90s Cartoons",
      playlist: [
        "d8a54KCGfLQ", // Better 90s cartoons videos
        "N3JVQ4Cv1SE",
        "TKtCVblxDRc"
      ],
      color: "#ff5252"
    },
    {
      id: 1,
      name: "90s Commercials",
      playlist: [
        "gZo1cFVoLQ8", // More reliable commercial compilations
        "EgkCxFt8XJ0",
        "DY6uHo31zeo"
      ],
      color: "#2196f3"
    },
    {
      id: 2,
      name: "90s TV Shows",
      playlist: [
        "U2HCuxV1Zdg", // More common TV show intros
        "rAyVdV4Kkx4", 
        "WfKUWvfNS5k"
      ],
      color: "#4caf50"
    }
  ];

  // Function to determine which video to play based on current time
  useEffect(() => {
    const determineVideoFromTime = () => {
      const now = new Date();
      const secondsSinceMidnight = 
        now.getHours() * 3600 + 
        now.getMinutes() * 60 + 
        now.getSeconds();
      
      const currentPlaylist = channels[currentChannel].playlist;
      const videoIndex = Math.floor(secondsSinceMidnight / 300) % currentPlaylist.length; // Change video every 5 minutes
      
      setVideoId(currentPlaylist[videoIndex]);
      setVideoError(false); // Reset error state when changing videos
    };

    determineVideoFromTime();
    // Update every minute to check if we need to change videos
    const intervalId = setInterval(determineVideoFromTime, 60000);
    
    return () => clearInterval(intervalId);
  }, [currentChannel, channels]);

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
            widget_referrer: window.location.href
          },
          events: {
            onReady: (event: any) => {
              playerReadyRef.current = true;
              event.target.setVolume(volume);
              if (!isMuted) {
                event.target.unMute();
              }
              
              // Hide YouTube logo and title
              const iframe = document.querySelector('#youtube-player') as HTMLIFrameElement;
              if (iframe) {
                iframe.style.opacity = '0';
                iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
                setTimeout(() => {
                  iframe.style.opacity = '1';
                  iframe.contentWindow?.postMessage('{"event":"command","func":"setOption","args":["showinfo","0"]}', '*');
                }, 1000);
              }
              
              // Start playback with slight delay
              setTimeout(() => event.target.playVideo(), 500);
            },
            onError: handleVideoError,
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.ENDED) {
                // Go to next video in playlist when current one ends
                const currentPlaylist = channels[currentChannel].playlist;
                const currentIndex = currentPlaylist.indexOf(videoId);
                const nextIndex = (currentIndex + 1) % currentPlaylist.length;
                setVideoId(currentPlaylist[nextIndex]);
              }
            }
          }
        });
      } catch (e) {
        console.error("Error initializing YouTube player:", e);
        setVideoError(true);
      }
    }

    // Cleanup function
    return () => {
      window.onYouTubeIframeAPIReady = () => {};
    };
  }, [videoId, isChangingChannel]);

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
    setShowChannelInfo(true);
    setVideoError(false);
    
    // Simulate TV channel changing effect
    setTimeout(() => {
      setCurrentChannel(nextChannel);
      
      // After changing the channel, hide the changing effect
      setTimeout(() => {
        setIsChangingChannel(false);
        
        // Hide channel info after 3 seconds
        setTimeout(() => setShowChannelInfo(false), 3000);
      }, 800);
    }, 500);
  };

  // Try the next video if the current one fails
  const handleVideoError = () => {
    setVideoError(true);
    console.log('Video failed to load');
    
    // Add fallback to static after 3 failed attempts
    const currentPlaylist = channels[currentChannel].playlist;
    const currentIndex = currentPlaylist.indexOf(videoId);
    const nextIndex = (currentIndex + 1) % currentPlaylist.length;
    
    if (currentPlaylist[nextIndex] === videoId) {
      // If all videos failed, switch channel
      changeChannel('next');
    } else {
      setVideoId(currentPlaylist[nextIndex]);
    }
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
  };

  // Handle mute/unmute
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div className="app-container">
      <div className="tv-set">
        <div className={`tv-screen ${isChangingChannel ? 'changing-channel' : ''}`}>
          {!isChangingChannel && !videoError && (
            <>
              <div id="youtube-container" className="youtube-container"></div>
              <div className="scanline" />
            </>
          )}
          {(isChangingChannel || videoError) && <div className="tv-static"></div>}
          {showChannelInfo && (
            <div className="channel-info">
              <div className="channel-number">{currentChannel + 1}</div>
              <div className="channel-name" style={{ color: channels[currentChannel].color }}>
                {channels[currentChannel].name}
              </div>
            </div>
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
                <div className="knob-label">VOL</div>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
