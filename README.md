# Uni Chat

A minimal, universal chat interface for your favorite Large Language Model (LLM), built with Next.js, Tailwind CSS, and Genkit AI. 

## Features
- **Chat Interface:** Clean, minimalistic chat interface for composing and sending messages.
- **AI Response Generation:** AI-powered response generation using a Large Language Model (LLM) tool (Google Gemini, GPT-4, etc.).
- **Response Display:** Responses are shown in a clean, readable format within the chat interface.
- **New Chat:** Start new chats, clearing previous conversations.
- **Minimalist Design:** Sleek, user-friendly, and responsive design.
- **LLM Configuration:** Connect to various LLMs by inputting API keys. Keys are stored only in your browser.
- **Theme Support:** Toggle between light and dark mode.

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation
```sh
npm install
```

### Development
```sh
npm run dev
```
The app will be available at [http://localhost:9002](http://localhost:9002).

### Build for Production
```sh
npm run build
npm start
```

## LLM Configuration
- Click the settings icon or use the dropdown to open the configuration dialog.
- Enter your API key for the desired LLM (e.g., Gemini, GPT-4).
- The key is stored in your browser's local storage and never sent to a server.

## Project Structure
- `src/app/` - Next.js app directory (main UI, layout, and pages)
- `src/components/` - UI components (chat, sidebar, dialogs, etc.)
- `src/ai/` - Genkit AI integration and flows
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions and types
- `docs/blueprint.md` - Design and feature blueprint

## Tech Stack
- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Genkit AI](https://github.com/genkit-dev/genkit)
- [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)
- [Radix UI](https://www.radix-ui.com/)
- [Lucide Icons](https://lucide.dev/)

## Environment Variables
- No server-side secrets required for chat. LLM API keys are stored in-browser.
- For Genkit development, see `.env.example` (if present) and `src/ai/dev.ts`.

## Deployment
- This project is ready for [Firebase App Hosting](https://firebase.google.com/docs/app-hosting).
- See `apphosting.yaml` for configuration.

## Style Guidelines
- Soft, muted blue (#8DBDD8) for calm and focus
- Very light gray (#F5F5F5) for a clean backdrop
- Pale cyan (#A0CED9) for highlights
- 'Inter', sans-serif font
- Minimalist, spacious layout
- Subtle animations for loading and transitions

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](LICENSE)
