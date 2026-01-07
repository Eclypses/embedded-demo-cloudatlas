# MTE Relay Demo

A single-page interactive demo showcasing the differences between standard TLS encryption and MTE Relay encryption for secure data transmission.

## Overview

This application provides a visual demonstration of two encryption approaches:

- **Standard TLS**: Encryption at the transport layer using HTTPS
- **MTE Relay**: Application-layer encryption combined with TLS for double encryption

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **MTE Relay Browser Client** - Encryption library

## Getting Started

### Development

```bash
npm install
npm run dev
```

The app runs on `http://localhost:5173`

## Project Structure

```
src/
├── main.tsx              # App entry point
├── index.css             # Styles
└── relay-demo/
    └── index.tsx         # Main demo component
```

## How It Works

### TLS-Only Flow

Data remains unencrypted in the browser, then gets encrypted by TLS for network transit. Uses the same encrypted data throughout the page lifecycle.

### MTE+TLS Flow

Data is encrypted at the application layer first, then again by TLS. This provides double encryption. New encrypted data is generated for each request.

The visualization shows:

1. Form submission
2. Encryption operations
3. Network transit
4. Decryption at destination
5. Final response

## Copy to another Project

1. Install the MTE Client SDK: `npm i mte-relay-browser-public-client`
2. Copy `src\relay-demo\index.tsx` into your source code.
3. Run it!
