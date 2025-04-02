# y2ktv

A nostalgic 90s TV simulator built with React, Bun, and Vite that plays YouTube videos of 90s TV shows and commercials in a retro TV interface.

## Features

- Fullscreen TV experience with a nostalgic CRT-style interface
- Multiple "channels" featuring different 90s content themes
- Channel switching with authentic TV static effects
- Deterministic programming based on time (like real TV, you can't rewind)
- Completely automatic playback with no user controls

## Preview

Turn on your virtual TV and enjoy classic 90s content! The TV plays content from predefined playlists, changing every 5 minutes, simulating a real TV broadcast experience.

## Setup and Run

This project uses Bun with React and Vite. Make sure you have [Bun installed](https://bun.sh/docs/installation) on your system.

```bash
# Install dependencies
bun install

# Run the development server
bun run dev
```

## How to Use

- Click on the channel buttons at the bottom of the TV to switch between different content themes
- The video will play automatically - there are no playback controls (just like a real TV!)
- The content changes every 5 minutes based on the current time


## Technical Notes

- The app uses the YouTube iframe API to embed videos
- YouTube controls are intentionally disabled for the authentic TV experience
- The current video and timestamp are deterministic based on current time
- Videos are rotated every 5 minutes to simulate TV programming

## Credits

This project was inspired by similar nostalgic TV simulators like ytch.xyz.