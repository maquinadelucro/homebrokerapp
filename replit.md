# Overview

This is a Next.js-based trading platform called "HOMEBROKER.AI" that integrates artificial intelligence for financial market analysis and automated trading. The application provides a comprehensive trading interface with real-time charting, AI-powered analysis, and automated trade execution capabilities. It features a dark-themed UI optimized for trading environments and includes both demo and real account support.

## Recent Changes (September 26, 2025)

- ✅ **Secure Login System**: Implemented complete authentication with real AES-256-CTR token encryption and secure session management
- ✅ **Database Integration**: Comprehensive PostgreSQL schema with Drizzle ORM for trading operations, user management, and audit logging
- ✅ **Balance Management**: Corrected balance API logic to prioritize demo account over empty real account balances
- ✅ **Production Security**: Implemented proper token encryption, secret redaction in logs, and secure API endpoint patterns
- ✅ **User Data API**: Secure user profile endpoint with Bearer authentication and cache control
- ✅ **Real-Only Account System**: Simplified system to operate exclusively with Real accounts, removing Demo account support
- ✅ **Multi-User Isolation**: Complete implementation enabling multiple users to operate simultaneously on their Real accounts without data conflicts
- ✅ **Trading Accounts System**: Created trading_accounts table enabling multiple Real broker accounts per user with encrypted token storage
- ✅ **Session-Based Authentication**: Refactored APIs to use secure session authentication instead of hardcoded credentials
- ✅ **Account Ownership Verification**: Implemented strict ownership checks preventing cross-user account access and enforcing Real-account-only operations
- ✅ **Per-Account Token Isolation**: Each trading account uses its own encrypted HomeBroker tokens stored server-side with Real account restrictions
- ✅ **User-Isolated Operation History**: Implemented secure trading history API with complete user isolation and robust pagination validation

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The application uses Next.js 13.5.4 with the App Router pattern, providing a modern React-based frontend. The UI is built using Shadcn/UI components, which are customizable components built on top of Radix UI primitives and styled with Tailwind CSS. The architecture follows a component-based design with dedicated trading components for charts, controls, and results display.

Key architectural decisions:
- **Component Library**: Shadcn/UI for consistent, accessible UI components
- **Styling**: Tailwind CSS for utility-first styling with dark theme optimization
- **State Management**: Zustand store for global trading state management
- **Real-time Updates**: WebSocket integration using Pusher protocol for live market data
- **Charts**: Lightweight Charts library for high-performance candlestick visualization
- **Forms**: React Hook Form with Zod validation for robust form handling

## Backend Integration
The application integrates with external trading APIs through a custom API layer. The trading functionality includes:
- **Authentication**: Secure JWT-based authentication with AES-256-CTR encrypted token storage and session management
- **Database Layer**: PostgreSQL with Drizzle ORM for user management, trading operations, audit logs, and real-time balance tracking
- **Trading Operations**: Support for binary options trading with configurable parameters and complete trade history
- **Balance Management**: Intelligent balance prioritization (demo over real when available) with real-time tracking
- **Market Data**: Real-time price feeds and historical chart data with WebSocket integration
- **Security**: Token encryption, secret redaction in logs, and secure API patterns with Bearer authentication

## State Management
The application uses Zustand for global state management, providing:
- **Trading Store**: Centralized state for assets, operations, and market data
- **Auth Store**: User authentication and session management
- **Real-time Data**: WebSocket connection state and live price updates

## UI/UX Design Patterns
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Trading Interface**: Professional trading platform design with dark theme
- **Modal System**: Portal-based modals for AI analysis and asset selection
- **Component Composition**: Reusable UI components following Radix UI patterns

## Real-time Features
- **WebSocket Connections**: Dual WebSocket setup for OTC and regular market data
- **Live Charts**: Real-time candlestick chart updates with 30-second intervals
- **Operation Tracking**: Live monitoring of active trading positions
- **Balance Updates**: Instant balance synchronization

# External Dependencies

## Core Framework & Runtime
- **Next.js 13.5.4**: React framework with App Router for server-side rendering and routing
- **React 18**: Frontend library for component-based UI development
- **TypeScript**: Type-safe JavaScript development

## UI Component Library
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives including dialogs, dropdowns, navigation menus, and form controls
- **Shadcn/UI**: Pre-styled component library built on Radix UI with Tailwind CSS integration
- **Lucide React**: Icon library providing consistent SVG icons throughout the application

## Styling & Design
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development and consistent design
- **Class Variance Authority**: Type-safe utility for creating variant-based component APIs
- **Tailwind CSS Animate**: Animation utilities for enhanced user interactions

## Charts & Visualization
- **Lightweight Charts**: High-performance charting library optimized for financial data visualization
- **Embla Carousel**: Touch-friendly carousel component for asset selection

## State Management & Data Handling
- **Zustand**: Lightweight state management solution for global application state
- **React Hook Form**: Performant form library with minimal re-renders and built-in validation
- **@hookform/resolvers**: Integration layer for schema validation with React Hook Form

## Database & ORM
- **Drizzle ORM**: Type-safe SQL ORM with PostgreSQL support for database operations
- **@neondatabase/serverless**: Serverless PostgreSQL database connector for Neon/Vercel Postgres
- **Drizzle Kit**: Database migration and schema management tools

## Authentication & Security
- **jsonwebtoken**: JWT token handling for secure authentication
- **@types/jsonwebtoken**: TypeScript definitions for JWT operations
- **AES-256-CTR Encryption**: Custom TokenCrypto implementation for secure token storage
- **Secret Management**: Environment-based secret management with automatic redaction in logs
- **Session Security**: SHA-256 hashed session tokens with expiration and revocation support

## Real-time Communication
- **WebSocket API**: Native browser WebSocket for real-time market data
- **Pusher Protocol**: WebSocket protocol implementation for reliable real-time updates

## Date & Time Handling
- **date-fns**: Modern JavaScript date utility library for date manipulation and formatting

## Development & Build Tools
- **ESLint**: Code linting with Next.js optimized configuration
- **PostCSS**: CSS processing with Tailwind CSS integration
- **Autoprefixer**: Automatic vendor prefix handling for cross-browser compatibility

## External Trading APIs
- **HomeBroker Trading API**: Primary trading platform integration for order execution and account management
- **Market Data Feeds**: Real-time and historical price data from multiple market sources
- **Authentication Services**: Secure login integration with existing trading platform credentials