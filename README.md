# LexiCal 📚

**Convert law school syllabi into organized calendar tasks with AI-powered analysis tools**

LexiCal is a comprehensive web application designed specifically for law students to streamline their academic planning. Upload your course syllabi and automatically extract assignments, readings, and deadlines into an organized calendar format. Plus, get AI-powered text analysis, PDF annotation, and flowchart generation tools.

## 🎥 Demo

[**Watch LexiCal Demo**](https://asu.zoom.us/rec/share/oXs_BINU_TwhmgUkwY3DRGk58OT0NWI68u5_WSd351nMw3sunBSxVTTCMJa5QY5Q.ABmj2zqiPDee9dmj)

**Passcode**: `Attached in the mail`


## ✨ Features

### 🎯 **Syllabus to Calendar Conversion**
- **PDF Upload**: Upload law school syllabi in PDF format (up to 10MB)
- **Smart Parsing**: AI-powered extraction of assignments, readings, exams, and deadlines
- **Calendar View**: Visualize all your academic tasks in an intuitive calendar interface
- **Task Management**: Track and manage your assignments with completion status

### 🤖 **AI Interpreter**
- **Text Analysis**: Select any text and get AI-powered explanations and analysis
- **Interactive Chat**: Ask follow-up questions about legal concepts and terminology
- **Context Awareness**: AI maintains context of your selected text for relevant responses
- **Legal Expertise**: Specialized understanding of legal documents and concepts

### 📄 **Advanced PDF Viewer**
- **Interactive Highlighting**: Highlight important sections with AI-powered annotations
- **Question-Answering**: Click on highlighted text to ask questions about specific content
- **Print Integration**: Print PDFs directly from the viewer
- **Zoom & Navigation**: Full-featured PDF viewing with zoom and page navigation

### 📊 **Flowchart Generator**
- **AI-Powered Creation**: Generate professional flowcharts from text descriptions
- **Multiple Node Types**: Start/end, process, decision, input/output nodes
- **Auto-Layout**: Intelligent automatic positioning using Dagre algorithm
- **Interactive Editing**: Drag, connect, and modify flowchart elements
- **Export Options**: Save and export your flowcharts

## 🏗️ Tech Stack

### Frontend
- **React 19** with TypeScript for modern, type-safe development
- **Vite** for fast development and optimized builds
- **Tailwind CSS** with **shadcn/ui** for beautiful, consistent UI components
- **React Flow** for interactive flowchart visualization
- **React PDF** for advanced PDF viewing capabilities
- **React Router** for client-side routing

### Backend
- **Node.js** with **Express** and TypeScript
- **OpenAI/DeepSeek API** integration for AI-powered features
- **PDF-Parse** for extracting text from PDF documents
- **Multer** for secure file upload handling
- **Natural** for text processing and NLP tasks

### Architecture
- **Monorepo structure** with separate frontend and backend packages
- **RESTful API** design with proper error handling
- **CORS enabled** for secure cross-origin requests
- **Helmet** for security headers and protection

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and **npm**
- **OpenAI API Key** or **DeepSeek API Key**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/LawBandit-lexical.git
   cd lexical
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   
   Create `.env` in the `backend/` directory:
   ```env
   PORT=3001
   OPENAI_API_KEY=your_openai_api_key_here
   # OR for DeepSeek:
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   DEEPSEEK_MODEL=deepseek/deepseek-chat-v3-0324
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - **Frontend**: http://localhost:5173
   - **Backend**: http://localhost:3001

### Individual Development

To run frontend and backend separately:

```bash
# Frontend only
cd frontend && npm run dev

# Backend only  
cd backend && npm run dev
```

## 📁 Project Structure

```
lexical/
├── frontend/                 # React + TypeScript frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── ui/          # shadcn/ui components
│   │   │   ├── Calendar.tsx          # Calendar view component
│   │   │   ├── SyllabusUpload.tsx   # PDF upload interface
│   │   │   ├── Interpreter.tsx      # AI text analysis
│   │   │   ├── PdfViewer.tsx        # Advanced PDF viewer
│   │   │   ├── FlowchartGenerator.tsx # AI flowchart creation
│   │   │   └── Layout.tsx           # Main app layout
│   │   ├── lib/             # API clients and utilities
│   │   ├── hooks/           # Custom React hooks
│   │   └── types/           # TypeScript definitions
│   └── package.json
├── backend/                  # Node.js + Express backend
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   │   ├── deepseek.controller.ts   # AI service controller
│   │   │   └── flowchart.controller.ts  # Flowchart API
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Business logic
│   │   │   ├── deepseek.service.ts     # AI integration
│   │   │   └── flowchart.service.ts    # Flowchart generation
│   │   ├── middleware/      # Express middleware
│   │   └── utils/           # Helper functions
│   └── package.json
├── package.json             # Root package.json (monorepo)
└── README.md
```

## 🎯 Usage Guide

### 1. **Upload Your Syllabus**
- Navigate to the main page
- Drag and drop your PDF syllabus or click to upload
- Wait for AI processing to extract assignments and dates

### 2. **View Your Calendar**
- Extracted assignments appear in the calendar view
- Click on dates to see detailed assignment information
- Track completion status for each task

### 3. **Use the AI Interpreter**
- Visit `/interpreter` or select text on any page
- Right-click selected text and choose "Interpreter"
- Ask questions about legal concepts, cases, or terminology

### 4. **Annotate PDFs**
- Visit `/pdf-viewer` to open PDF documents
- Highlight important sections
- Click highlights to ask AI questions about the content

### 5. **Generate Flowcharts**
- Visit `/flowchart` 
- Describe the process you want to visualize
- AI will generate a professional flowchart with proper nodes and connections

## 🔧 Configuration

### Environment Variables

**Backend (`backend/.env`)**:
```env
PORT=3001                                    # Server port
OPENAI_API_KEY=your_key_here                # OpenAI API key
DEEPSEEK_API_KEY=your_key_here              # DeepSeek API key (alternative)
DEEPSEEK_MODEL=deepseek/deepseek-chat-v3-0324 # AI model to use
```

### API Configuration
The app supports both OpenAI and DeepSeek APIs. Configure your preferred provider in the backend environment variables.

## 📝 API Endpoints

### Health Check
- `GET /api/health` - Server status check

### AI Services
- `POST /api/deepseek/extract-assignments` - Extract assignments from PDF
- `POST /api/deepseek/generate-response` - Generate AI responses for text analysis

### Flowchart Generation
- `POST /api/flowchart/generate` - Create flowcharts from descriptions
- `POST /api/flowchart/refine` - Refine existing flowcharts

## 🏗️ Development

### Build for Production

```bash
# Build both frontend and backend
npm run build

# Build individually
cd frontend && npm run build
cd backend && npm run build
```

### Running Production Build

```bash
# Start backend server
cd backend && npm start

# Serve frontend (after building)
cd frontend && npm run preview
```

### Linting and Code Quality

```bash
# Frontend linting
cd frontend && npm run lint

# Backend linting  
cd backend && npm run lint

# Format code (backend)
cd backend && npm run format
```

## 🆘 Support

Having issues? Check out our troubleshooting guide:

### Common Issues

**"API rate limit exceeded"**
- Wait a few minutes before making more requests
- Check your API key quotas

**"PDF upload fails"**
- Ensure PDF is under 10MB
- Check that the file is a valid PDF format

**"Frontend not connecting to backend"**
- Verify backend is running on port 3001
- Check CORS configuration

### Contact & Support

Need help or have questions? Reach out to us:

- **📧 Email**: [niragimasalia@gmail.com](mailto:niragimasalia@gmail.com)
- **💼 LinkedIn**: [https://www.linkedin.com/in/niragi-masalia/](https://www.linkedin.com/in/niragi-masalia/)

We're here to help you make the most of LexiCal for your law school journey!

## 🎉 Acknowledgments

- Built with modern React and Node.js ecosystems
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- PDF processing powered by [PDF-Parse](https://www.npmjs.com/package/pdf-parse)
- Flowchart visualization using [React Flow](https://reactflow.dev/)
- AI capabilities through OpenAI and DeepSeek APIs

---
