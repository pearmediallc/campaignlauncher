import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress, Alert } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAll?: boolean;
  fallback?: React.ReactElement | null;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  fallback
}) => {
  const { user, loading, hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check permissions if required
  if (requiredPermission) {
    const [resource, action] = requiredPermission.split(':');
    if (!hasPermission(resource, action)) {
      return fallback !== undefined ? fallback : (
        <Box p={3}>
          <Alert severity="error">
            You don't have permission to access this page. Required: {requiredPermission}
          </Alert>
        </Box>
      ) as React.ReactElement;
    }
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAccess = requireAll 
      ? hasAllPermissions(...requiredPermissions)
      : hasAnyPermission(...requiredPermissions);
    
    if (!hasAccess) {
      return fallback !== undefined ? fallback : (
        <Box p={3}>
          <Alert severity="error">
            You don't have permission to access this page. 
            Required {requireAll ? 'all' : 'any'} of: {requiredPermissions.join(', ')}
          </Alert>
        </Box>
      ) as React.ReactElement;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;