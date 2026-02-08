# ft_transcendence Frontend

A modern React + Vite + Tailwind CSS frontend for the Transcendence trivia gaming platform.

## 🚀 Features

- ⚡ **Vite** - Lightning-fast build tool
- ⚛️ **React 18** - Latest React features
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 🔐 **Authentication** - JWT-based auth with context management
- 👥 **User Management** - Profile, avatar, friends system
- 🌐 **Internationalization** - Multi-language support (EN, FR, ES)
- 📡 **Real-time** - Socket.io integration for live updates
- 📱 **Responsive** - Mobile-first design
- ♿ **Accessible** - WCAG 2.1 AA compliant

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── common/       # Reusable UI components (Button, Input, Card, etc.)
│   │   ├── auth/         # Authentication components
│   │   ├── user/         # User-related components
│   │   └── game/         # Game-related components
│   ├── pages/            # Page components (Home, Login, Profile, etc.)
│   ├── context/          # React Context (AuthContext)
│   ├── hooks/            # Custom React hooks (useAuth, useForm)
│   ├── services/         # API services (authService, userService, etc.)
│   ├── i18n/             # Internationalization setup
│   ├── styles/           # Global styles
│   ├── utils/            # Utility functions
│   ├── App.jsx           # Root App component
│   └── main.jsx          # Entry point
├── public/               # Static assets
├── index.html            # HTML template
├── package.json          # Dependencies
├── vite.config.js        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── postcss.config.js     # PostCSS configuration
└── .env.example          # Environment variables template
```

## 🔧 Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## 🎨 Reusable Components

All components are located in `src/components/common/`:

- **Button** - Customizable button with variants and sizes
- **Input** - Form input with validation
- **Card** - Reusable card component
- **Modal** - Dialog modal
- **Avatar** - User avatar with online status
- **Badge** - Status badges
- **Navbar** - Navigation bar
- **Spinner** - Loading spinner
- **Alert** - Alert messages
- **ProtectedRoute** - Route protection for authenticated users

## 🔐 Authentication

Authentication is managed through React Context (`AuthContext`). The `useAuth` hook provides:

- `user` - Current user data
- `loading` - Loading state
- `login()` - Login function
- `signup()` - Signup function
- `logout()` - Logout function
- `updateUser()` - Update user data

## 🌐 API Integration

All API calls go through the `apiClient` (axios instance) in `src/services/apiClient.js`.

Services available:
- `authService` - Authentication endpoints
- `userService` - User management endpoints
- `socketService` - WebSocket communication

## 🌍 Internationalization

The app supports 3 languages by default:
- **English** (en)
- **French** (fr)
- **Spanish** (es)

Translation files are in `src/i18n/locales/`.

## 📝 Development Notes

- All forms use the `useForm` hook for state management
- Components are organized by feature
- Global styles and Tailwind utilities are in `src/styles/globals.css`
- No console errors or warnings - follows best practices

## 🚀 Next Steps

1. Connect to backend API endpoints
2. Implement OAuth 2.0 integration
3. Add Socket.io event handlers for real-time updates
4. Build game components
5. Add tournament and gamification features

## 📦 Dependencies

See `package.json` for complete list. Key dependencies:
- react & react-dom
- react-router-dom
- axios
- socket.io-client
- react-i18next
- react-hot-toast
- tailwindcss
