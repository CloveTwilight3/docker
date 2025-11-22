# Doughmination System® - Tech Stack

A modern full-stack web application for plural system management with real-time updates, member tracking, and comprehensive admin tools.

---

## 🎯 Overview

The Doughmination System® is built with a Python FastAPI backend and React TypeScript frontend, featuring real-time WebSocket communication, JWT authentication, and a beautiful, accessible UI built with Tailwind CSS and shadcn/ui.

---

## 🔧 Backend Stack

### Core Framework & Server
<img src="https://img.shields.io/badge/FastAPI-009485.svg?logo=fastapi&logoColor=white" />
<img src="https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white" />
<img src="https://img.shields.io/badge/Uvicorn-2C5F2D?logo=gunicorn&logoColor=white" />

- **FastAPI** (v0.116.1) - Modern, fast web framework for building APIs
- **Uvicorn** (v0.35.0) - Lightning-fast ASGI server with standard support
- **Python 3.x** - Core programming language

### Authentication & Security
<img src="https://img.shields.io/badge/JWT-000000?logo=json-web-tokens&logoColor=white" />
<img src="https://img.shields.io/badge/Cloudflare-F38020?logo=cloudflare&logoColor=white" />

- **python-jose[cryptography]** (v3.5.0) - JWT token handling and validation
- **passlib[bcrypt]** (v1.7.4) - Secure password hashing
- **bcrypt** (v4.3.0) - Password encryption algorithms
- **Cloudflare Turnstile** - CAPTCHA protection on login endpoints

### HTTP & Real-time Communication
<img src="https://img.shields.io/badge/WebSocket-010101?logo=socket.io&logoColor=white" />

- **httpx** (v0.28.1) - Async HTTP client for external API calls
- **websockets** (v15.0.1) - WebSocket support for real-time updates
- **CORS Middleware** - Cross-origin resource sharing configuration

### Utilities & File Handling
- **python-dotenv** (v1.1.1) - Environment variable management
- **python-multipart** (v0.0.20) - Multipart form data handling
- **aiofiles** (v24.1.0) - Async file I/O operations
- **Pillow** (v11.0.0) - Image processing and validation

### External APIs
- **PluralKit API** - Integration for system member and fronting data

---

## ⚛️ Frontend Stack

### Core Framework
<img src="https://img.shields.io/badge/React-%2320232a.svg?logo=react&logoColor=%2361DAFB" />
<img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=fff" />

- **React** (v18.3.1) - Modern UI library with hooks
- **TypeScript** (v5.8.3) - Type-safe JavaScript
- **Vite** (v5.4.20) - Next-generation frontend build tool

### Routing & Navigation
<img src="https://img.shields.io/badge/React_Router-CA4245?logo=react-router&logoColor=white" />

- **react-router-dom** (v6.30.1) - Declarative routing for React

### UI Components & Styling
<img src="https://img.shields.io/badge/Tailwind%20CSS-%2338B2AC.svg?logo=tailwind-css&logoColor=white" />
<img src="https://img.shields.io/badge/Radix%20UI-161618?logo=radix-ui&logoColor=white" />
<img src="https://img.shields.io/badge/shadcn/ui-000000?logo=shadcnui&logoColor=white" />
<img src="https://img.shields.io/badge/Lucide-F56565?logo=lucide&logoColor=white" />

- **Tailwind CSS** (v3.4.17) - Utility-first CSS framework
- **shadcn/ui** - Beautiful, accessible component library
- **Radix UI** - Unstyled, accessible component primitives
  - `@radix-ui/react-*` (40+ component packages)
- **tailwindcss-animate** (v1.0.7) - Animation utilities
- **@tailwindcss/typography** (v0.5.16) - Beautiful typographic defaults
- **next-themes** (v0.3.0) - Perfect dark mode support
- **lucide-react** (v0.462.0) - Beautiful icon library

### State Management & Data Fetching
<img src="https://img.shields.io/badge/TanStack_Query-FF4154?logo=react-query&logoColor=white" />

- **@tanstack/react-query** (v5.83.0) - Powerful async state management

### Form Handling & Validation
<img src="https://img.shields.io/badge/React_Hook_Form-EC5990?logo=reacthookform&logoColor=white" />
<img src="https://img.shields.io/badge/Zod-3E67B1?logo=zod&logoColor=white" />

- **react-hook-form** (v7.61.1) - Performant form management
- **@hookform/resolvers** (v3.10.0) - Validation resolvers
- **zod** (v3.25.76) - TypeScript-first schema validation

### Charts & Data Visualization
<img src="https://img.shields.io/badge/Recharts-FF6384?logo=chart.js&logoColor=white" />

- **recharts** (v2.15.4) - Composable charting library

### UI Utilities
- **class-variance-authority** (v0.7.1) - CVA for component variants
- **clsx** (v2.1.1) - Conditional className utility
- **tailwind-merge** (v2.6.0) - Merge Tailwind classes without conflicts
- **date-fns** (v3.6.0) - Modern date utility library
- **sonner** (v1.7.4) - Beautiful toast notifications
- **cmdk** (v1.1.1) - Command palette component
- **vaul** (v0.9.9) - Drawer/modal component
- **embla-carousel-react** (v8.6.0) - Lightweight carousel
- **react-resizable-panels** (v2.1.9) - Resizable panel layouts
- **input-otp** (v1.4.2) - OTP/PIN input component

---

## 🚀 Infrastructure & DevOps

### Containerization
<img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white" />

- **Docker** - Containerization platform
- **Docker Compose** - Multi-container orchestration

### CI/CD
<img src="https://img.shields.io/badge/GitHub_Actions-2088FF?logo=github-actions&logoColor=white" />

- **GitHub Actions** - Automated testing and deployment

### Web Server & Hosting
<img src="https://img.shields.io/badge/Nginx-009639?logo=nginx&logoColor=white" />

- **Nginx** - Reverse proxy and static file serving
- **HTTPS/SSL** - Secure communication
- **Domain**: www.doughmination.win

---

## 🛠️ Development Tools

### Code Quality & Linting
<img src="https://img.shields.io/badge/ESLint-4B32C3?logo=eslint&logoColor=white" />

- **ESLint** (v9.32.0) - JavaScript/TypeScript linting
- **typescript-eslint** (v8.38.0) - TypeScript-specific rules
- **eslint-plugin-react-hooks** (v5.2.0) - React hooks linting
- **eslint-plugin-react-refresh** (v0.4.20) - React Fast Refresh rules

### Build Tools
<img src="https://img.shields.io/badge/PostCSS-DD3A0A?logo=postcss&logoColor=white" />
<img src="https://img.shields.io/badge/Node.js-6DA55F?logo=node.js&logoColor=white" />

- **@vitejs/plugin-react** (v5.0.3) - React plugin for Vite
- **@vitejs/plugin-react-swc** (v3.11.0) - SWC-based React plugin (faster builds)
- **PostCSS** (v8.5.6) - CSS transformation tool
- **Autoprefixer** (v10.4.21) - Automatic CSS vendor prefixing

### IDE
<img src="https://custom-icon-badges.demolab.com/badge/Visual%20Studio%20Code-0078d7.svg?logo=vsc&logoColor=white" />

- **Visual Studio Code** - Primary development environment

---

## ✨ Key Features

### Real-time Communication
- WebSocket connections for instant updates
- Live fronting status changes
- Real-time mental state updates
- Admin broadcast commands

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin/User)
- Secure password hashing with bcrypt
- Protected routes and API endpoints
- User profile management with avatar uploads

### Data Management
- **Member Management**: Complete CRUD operations
- **Tagging System**: Flexible categorization
- **Status Updates**: Thought-bubble style member statuses
- **Mental Health Tracking**: System-wide mental state monitoring
- **Fronting/Switching**: Real-time tracking and history
- **Metrics & Analytics**: Comprehensive fronting statistics

### UI/UX Features
- 🌓 Dark/Light theme toggle
- 📱 Fully responsive design
- ♿ WCAG accessibility standards
- 🎨 Beautiful, modern interface
- 🔍 Advanced search and filtering
- 📊 Interactive charts and visualizations

### SEO & Metadata
- Dynamic Open Graph tags for member pages
- Custom Discord/Twitter embeds
- Sitemap.xml for search engines
- robots.txt configuration
- Member-specific meta tags with colors and avatars

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📝 License

This project is protected by The Butterfly Network Open License (Version 1.0). Doughmination System® is a registered trademark in the United Kingdom (UK00004263144).

---

**Built with ❤️ by the Doughmination System®**