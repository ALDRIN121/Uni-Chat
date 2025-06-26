# Uni Chat Frontend

This is the frontend for the Uni Chat application, built with Next.js, React, and Tailwind CSS.

## Prerequisites
- Node.js (v20 or higher recommended)
- npm or yarn

## Setup

1. **Install dependencies:**
   ```zsh
   npm install
   # or
   yarn install
   ```

2. **Development server:**
   ```zsh
   npm run dev
   # or
   yarn dev
   ```
   The app will be available at [http://localhost:9002](http://localhost:9002) (or your configured port).

3. **Environment variables:**
   - No server-side secrets are required for chat. LLM API keys are stored in-browser.
   - For Genkit development, see `.env.example` (if present) and `src/ai/dev.ts`.

4. **Build for production:**
   ```zsh
   npm run build
   npm start
   ```

## Project Structure
- `src/app/` - Main UI, layout, and pages
- `src/components/` - UI components
- `src/ai/` - Genkit AI integration and flows
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions and types

## Tech Stack
- Next.js
- React
- Tailwind CSS
- Genkit AI

## Notes
- Make sure the backend is running for full chat functionality.
- For local development, the backend is expected at `http://localhost:8000`.

---
