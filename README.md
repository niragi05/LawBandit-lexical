# LexiCal

Convert law school syllabi into calendar tasks automatically.

## Project Structure

```
lexical/
├── frontend/          # React + TypeScript frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── utils/       # Utility functions
│   │   ├── types/       # TypeScript type definitions
│   │   ├── styles/      # CSS and styling files
│   │   ├── services/    # API service functions
│   │   └── assets/      # Static assets
│   ├── public/          # Public static files
│   └── package.json
├── backend/           # Node.js + TypeScript backend
│   ├── src/
│   │   ├── controllers/  # Route controllers
│   │   ├── models/       # Data models
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Express middleware
│   │   ├── utils/        # Utility functions
│   │   ├── config/       # Configuration files
│   │   └── services/     # Business logic services
│   ├── tests/           # Test files
│   └── package.json
└── package.json       # Root package.json for monorepo
```

## Getting Started

1. Install dependencies:
   ```bash
   npm run install-all
   ```

2. Start development servers:
   ```bash
   npm run dev
   ```

This will start both the frontend (http://localhost:3000) and backend (http://localhost:5000) servers concurrently.

## Features

- Upload law school syllabi (PDF format)
- Automatic parsing of assignments, readings, and exams
- Convert syllabus dates to calendar entries
- Calendar and list view options
- Task management and tracking
