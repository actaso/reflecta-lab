# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Development:
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

The project uses npm as the package manager. All commands should be run from the `reflecta/` directory.

## Architecture

This is a Next.js 15 application using the App Router with TypeScript and TailwindCSS v4. Key characteristics:

- **Framework**: Next.js 15 with App Router architecture
- **Styling**: TailwindCSS v4 with PostCSS
- **Fonts**: Geist Sans and Geist Mono from next/font/google
- **TypeScript**: Strict mode enabled with path aliases (`@/*` → `./src/*`)
- **Structure**: Standard App Router layout with `src/app/` containing pages and layout

The application follows Next.js App Router conventions:
- `src/app/layout.tsx` - Root layout with font configuration
- `src/app/page.tsx` - Home page component
- `src/app/globals.css` - Global styles

Assets are served from the `public/` directory. The project is currently a fresh Next.js installation with default styling and structure.