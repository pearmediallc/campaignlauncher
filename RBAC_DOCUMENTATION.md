# Facebook Campaign Launcher - RBAC Security Documentation

## Overview
This document provides comprehensive information about the Role-Based Access Control (RBAC) system implemented in the Facebook Campaign Launcher application.

## Architecture

### Database Schema
The RBAC system uses 8 main tables:

1. **users** - User accounts
2. **roles** - System and custom roles
3. **permissions** - Granular permissions
4. **resources** - Ad accounts, campaigns, pages
5. **user_roles** - User-to-role mappings
6. **role_permissions** - Role-to-permission mappings
7. **user_resources** - Direct resource access grants
8. **audit_logs** - Complete audit trail

### Caching Layer
- Redis is used for caching user permissions
- 5-minute TTL for permission cache
- Automatic cache invalidation on permission changes

## Default Roles

### Super Admin
- Full system access
- Can manage all users, roles, and resources
- Access to all campaigns and ad accounts

### Admin
- Administrative access
- Cannot delete users or roles
- Can manage campaigns and resources

### Manager
- Campaign management access
- Can approve/reject campaigns
- Read access to users and roles

### Media Buyer
- Can create and update campaigns
- Cannot delete campaigns
- Read-only access to ad accounts and pages

### Viewer
- Read-only access to campaigns
- Cannot create or modify any resources

## Permission Model

### Resource Types
- `user` - User management
- `role` - Role management
- `campaign` - Campaign operations
- `ad_account` - Ad account access
- `page` - Facebook page access
- `resource` - Resource grant/revoke
- `audit` - Audit log access

### Actions
- `create` - Create new resources
- `read` - View resources
- `update` - Modify existing resources
- `delete` - Remove resources
- `approve` - Approve campaigns
- `pause` - Pause campaigns
- `resume` - Resume campaigns
- `grant` - Grant access
- `revoke` - Revoke access

## API Endpoints

### Authentication
```
POST /api/auth/register - Register new user
POST /api/auth/login - User login
GET /api/auth/me - Get current user
PUT /api/auth/password - Change password
POST /api/auth/logout - Logout (audit logging)
```

### User Management
```
GET /api/users - List all users (requires user:read)
GET /api/users/:id - Get user details (requires user:read)
POST /api/users - Create user (requires user:create)
PUT /api/users/:id - Update user (requires user:update)
DELETE /api/users/:id - Delete user (requires user:delete)
POST /api/users/:id/roles - Assign roles (requires role:assign)
GET /api/users/:id/permissions - Get user permissions
POST /api/users/:id/resources - Grant resource access (requires resource:grant)
DELETE /api/users/:id/resources/:resourceId - Revoke access (requires resource:revoke)
```

### Campaign Operations
```
POST /api/campaigns/create - Create campaign (requires campaign:create)
GET /api/campaigns - List campaigns (requires campaign:read)
PUT /api/campaigns/:id - Update campaign (requires campaign:update + resource access)
DELETE /api/campaigns/:id - Delete campaign (requires campaign:delete + resource access)
```

## Security Features

### Authentication
- JWT tokens with configurable expiration
- Bcrypt password hashing (10 rounds)
- Token validation on every request

### Rate Limiting
- General API: 100 requests per 15 minutes
- Auth endpoints: 5 requests per 15 minutes
- Per-IP address limiting

### Security Headers
- Helmet.js for security headers
- CORS configuration
- XSS protection
- Content Security Policy

### Audit Logging
- All actions are logged
- Includes user, action, resource, timestamp
- IP address and user agent tracking
- Success/failure status
- Searchable and exportable

## Frontend Integration

### Auth Context
```typescript
const { 
  user,
  hasPermission,
  hasResourceAccess,
  login,
  logout 
} = useAuth();
```

### Protected Routes
```typescript
<ProtectedRoute requiredPermission="campaign:create">
  <CampaignForm />
</ProtectedRoute>
```

### Permission Checks
```typescript
if (hasPermission('campaign', 'create')) {
  // Show create button
}

if (hasResourceAccess('ad_account', accountId, 'write')) {
  // Allow campaign creation
}
```

## Setup Instructions

### 1. Environment Variables
Add to `.env`:
```env
# Database
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=fb_campaign_launcher
DB_USER=root
DB_PASSWORD=

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=7d

# Session
SESSION_SECRET=your_session_secret_here
```

### 2. Database Setup
```bash
# Create database
mysql -u root -p
CREATE DATABASE fb_campaign_launcher;

# Run migrations
npx sequelize-cli db:migrate
```

### 3. Redis Setup
```bash
# Install Redis (Mac)
brew install redis
brew services start redis

# Install Redis (Ubuntu)
sudo apt-get install redis-server
sudo systemctl start redis
```

### 4. Start Services
```bash
# Backend
cd backend
npm install
npm start

# Frontend
cd frontend
npm install
npm start
```

## Testing

### Create Test User
```bash
curl -X POST http://localhost:5002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Login
```bash
curl -X POST http://localhost:5002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Check Permissions
```bash
curl -X GET http://localhost:5002/api/users/1/permissions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Best Practices

### Role Assignment
1. Follow principle of least privilege
2. Regularly review role assignments
3. Use roles instead of direct permissions
4. Document custom roles

### Resource Access
1. Grant minimum required permissions
2. Review resource access regularly
3. Revoke access when no longer needed
4. Use audit logs for compliance

### Security
1. Rotate JWT secrets regularly
2. Use strong passwords (min 8 chars)
3. Enable 2FA when available
4. Monitor audit logs for suspicious activity
5. Keep dependencies updated

## Troubleshooting

### Common Issues

#### Permission Denied
- Check user roles: `GET /api/auth/me`
- Verify permissions: `GET /api/users/:id/permissions`
- Check resource access for specific resources

#### Cache Issues
- Clear Redis cache: `redis-cli FLUSHALL`
- Check Redis connection in logs
- Verify cache TTL settings

#### Database Connection
- Verify MySQL is running
- Check database credentials in .env
- Ensure database exists

#### Token Issues
- Check token expiration
- Verify JWT secret matches
- Ensure Authorization header format: `Bearer TOKEN`

## Compliance

### GDPR Compliance
- User data export capability
- Right to deletion
- Audit trail of data access
- Consent tracking

### Security Auditing
- Complete audit logs
- User action tracking
- Failed login monitoring
- Permission change tracking

## API Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": {}
}
```

### Permission Error
```json
{
  "error": "Insufficient permissions",
  "required": "resource:action"
}
```

## Migration Guide

### Adding New Permissions
1. Add to PermissionService.createDefaultRolesAndPermissions()
2. Run server to auto-create
3. Assign to appropriate roles
4. Update documentation

### Custom Roles
1. Create role via API or database
2. Assign permissions
3. Document role purpose
4. Test thoroughly

## Support

For issues or questions:
1. Check audit logs for error details
2. Review this documentation
3. Check server logs
4. Contact system administrator