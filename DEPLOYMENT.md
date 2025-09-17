# OPSIS Deployment Guide

## Overview
OPSIS is an accessibility-first online exam platform built with React, Express, and PostgreSQL. This guide provides comprehensive deployment instructions for production.

## Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Domain or hosting platform (Replit, Vercel, Railway, etc.)

## Environment Variables
Set the following environment variables in your production environment:

### Required Variables
```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Authentication (Replit Auth)
SESSION_SECRET=your-secure-random-session-secret
REPL_ID=your-replit-app-id
ISSUER_URL=https://replit.com/oidc
REPLIT_DOMAINS=yourdomain.com,yourapp.replit.app

# Optional: Email Service (if using SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
```

### Environment Setup
1. **Session Secret**: Generate a secure random string for SESSION_SECRET
2. **Replit Auth**: Configure your app in Replit's OAuth settings
3. **Database**: Set up PostgreSQL and get connection string
4. **Domains**: List all domains where your app will be accessible

## Database Setup

### 1. Create Database Schema
```bash
# Install dependencies
npm install

# Push database schema (creates tables)
npm run db:push
```

### 2. Create Admin User (Manual Setup)
After deployment, you'll need to create an admin user manually in the database:

```sql
-- Connect to your PostgreSQL database and run:
INSERT INTO users (id, email, role, "firstName", "lastName", "createdAt", "updatedAt")
VALUES (
  'admin-user-id', 
  'admin@yourdomain.com', 
  'admin', 
  'Admin', 
  'User', 
  NOW(), 
  NOW()
);
```

## Deployment Options

### Option 1: Replit Deployment (Recommended)
1. Fork or import the project to Replit
2. Set environment variables in Replit Secrets
3. Use the deployment button to deploy
4. Configure custom domain if needed

### Option 2: Railway Deployment
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Railway will automatically deploy on push

### Option 3: Vercel + Railway Database
1. Deploy frontend to Vercel
2. Deploy backend to Railway or other Node.js host
3. Set up PostgreSQL database (Railway, Supabase, or PlanetScale)

### Option 4: Self-Hosted
1. Set up VPS with Node.js and PostgreSQL
2. Clone repository and install dependencies
3. Set environment variables
4. Use PM2 or similar for process management
5. Set up reverse proxy (nginx) with SSL

## Post-Deployment Configuration

### 1. Admin Access
1. Create admin user in database (see Database Setup)
2. Log in with admin credentials
3. Access Admin Dashboard to create users and send invitations

### 2. Email Service (Optional)
For automatic email invitations:
1. Sign up for SendGrid (free tier available)
2. Add SENDGRID_API_KEY to environment variables
3. Configure sender email in SendGrid dashboard

Alternative free options:
- EmailJS for client-side email sending
- Mailgun (free tier)
- Resend (free tier)

### 3. SSL/HTTPS
Ensure your deployment has HTTPS enabled:
- Replit: Automatic HTTPS
- Vercel: Automatic HTTPS
- Railway: Automatic HTTPS
- Self-hosted: Use Let's Encrypt with certbot

## Security Considerations

### 1. Environment Variables
- Use strong SESSION_SECRET (32+ characters)
- Never commit secrets to version control
- Regularly rotate API keys

### 2. Database Security
- Use strong database passwords
- Enable SSL for database connections
- Regularly backup database

### 3. Access Control
- Create admin users sparingly
- Regularly audit user roles
- Monitor audit logs

## Features Overview

### Accessibility Features
- **Advanced Voice Controls**: 40+ voice commands for navigation and exam taking
- **Screen Reader Support**: Full ARIA compliance and announcements
- **Text-to-Speech**: Customizable TTS with multiple voices and speeds
- **High Contrast Themes**: Multiple theme options including high contrast
- **Keyboard Navigation**: Full keyboard accessibility throughout

### User Roles
- **Students**: Take exams, view results, access voice help
- **Instructors**: Create/manage exams, view student results, send invitations
- **Admins**: Full platform access, user management, system administration

### Core Functionality
- **Exam Creation**: Multiple question types (multiple choice, true/false, short answer, essay)
- **Timed Exams**: Configurable time limits with auto-submit
- **Real-time Saving**: Auto-save exam progress
- **Results Analytics**: Comprehensive score tracking and analytics
- **Invitation System**: Email-based user invitations with role assignment

## Monitoring and Maintenance

### 1. Health Checks
Monitor these endpoints:
- `GET /` - Frontend health
- `GET /api/auth/user` - Authentication health

### 2. Database Maintenance
- Regular backups
- Monitor connection pool usage
- Check for long-running queries

### 3. Performance Monitoring
- Monitor response times
- Track memory usage
- Monitor database query performance

## Troubleshooting

### Common Issues

#### 1. Authentication Not Working
- Check REPLIT_DOMAINS includes your domain
- Verify SESSION_SECRET is set
- Ensure HTTPS is enabled

#### 2. Database Connection Issues
- Verify DATABASE_URL format
- Check firewall settings
- Ensure database server is running

#### 3. Voice Commands Not Working
- Ensure HTTPS (required for Web Speech API)
- Check browser compatibility
- Verify microphone permissions

#### 4. Email Invitations Not Sending
- Check SENDGRID_API_KEY is set
- Verify sender email is configured
- Check SendGrid dashboard for errors

### Support
For deployment issues:
1. Check application logs
2. Verify all environment variables are set
3. Test database connectivity
4. Check browser console for client-side errors

## Success Checklist
- [ ] Database schema created and admin user added
- [ ] Environment variables configured
- [ ] HTTPS enabled
- [ ] Admin can log in and access dashboard
- [ ] Users can be created/invited
- [ ] Exams can be created and taken
- [ ] Voice commands working (requires HTTPS)
- [ ] Email invitations working (if configured)

Your OPSIS platform is now ready for production use!