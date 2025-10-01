import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Alert,
} from '@mui/material';
import { Edit, Delete, Add, LockReset } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { toast } from 'react-toastify';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: Array<{ id: number; name: string }>;
  status: string;
  createdAt: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
}

export const UserManagement: React.FC = () => {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null);
  const [resetPasswordUserEmail, setResetPasswordUserEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    roleId: 0,
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.users || []);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await api.get('/rbac/roles');
      setRoles(response.data || []);
    } catch (error) {
      console.error('Failed to fetch roles');
    }
  };

  const handleCreateUser = async () => {
    try {
      // Backend expects roleIds as an array, convert roleId to roleIds
      const userData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        roleIds: formData.roleId ? [formData.roleId] : [] // Convert single roleId to array
      };

      await api.post('/users/', userData);
      toast.success('User created successfully');
      setDialogOpen(false);
      fetchUsers();
      resetForm();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    try {
      await api.put(`/users/${editingUser.id}`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        roleId: formData.roleId,
      });
      toast.success('User updated successfully');
      setDialogOpen(false);
      fetchUsers();
      resetForm();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.delete(`/users/${userId}`);
        toast.success('User deleted successfully');
        fetchUsers();
      } catch (error) {
        toast.error('Failed to delete user');
      }
    }
  };

  const handleOpenResetPasswordDialog = (user: User) => {
    setResetPasswordUserId(user.id);
    setResetPasswordUserEmail(user.email);
    setNewPassword('');
    setResetPasswordDialogOpen(true);
  };

  const handleCloseResetPasswordDialog = () => {
    setResetPasswordDialogOpen(false);
    setResetPasswordUserId(null);
    setResetPasswordUserEmail('');
    setNewPassword('');
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUserId || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      await api.put(`/users/${resetPasswordUserId}/reset-password`, {
        newPassword: newPassword
      });
      toast.success('Password reset successfully');
      handleCloseResetPasswordDialog();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reset password');
    }
  };

  const openDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        password: '',
        roleId: user.roles[0]?.id || 0,
      });
    } else {
      setEditingUser(null);
      resetForm();
    }
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      roleId: 0,
    });
    setEditingUser(null);
  };

  if (!hasPermission('user', 'read')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">You don't have permission to view users</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">User Management</Typography>
          {hasPermission('user', 'create') && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => openDialog()}
            >
              Add User
            </Button>
          )}
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.firstName} {user.lastName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.roles.map((role) => (
                      <Chip key={role.id} label={role.name} size="small" />
                    ))}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.status}
                      color={user.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {hasPermission('user', 'update') && (
                      <>
                        <IconButton onClick={() => openDialog(user)} size="small">
                          <Edit />
                        </IconButton>
                        <IconButton onClick={() => handleOpenResetPasswordDialog(user)} size="small" title="Reset Password">
                          <LockReset />
                        </IconButton>
                      </>
                    )}
                    {hasPermission('user', 'delete') && (
                      <IconButton onClick={() => handleDeleteUser(user.id)} size="small" color="error">
                        <Delete />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? 'Edit User' : 'Create User'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {!editingUser && (
              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                fullWidth
                required
              />
            )}
            <TextField
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              fullWidth
              required
            />
            {!editingUser && (
              <TextField
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                fullWidth
                required
              />
            )}
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value as number })}
                label="Role"
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={editingUser ? handleUpdateUser : handleCreateUser}
            variant="contained"
          >
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={resetPasswordDialogOpen}
        onClose={handleCloseResetPasswordDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              You are resetting the password for: <strong>{resetPasswordUserEmail}</strong>
            </Alert>
            <TextField
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              helperText="Minimum 8 characters"
              error={newPassword.length > 0 && newPassword.length < 8}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResetPasswordDialog}>Cancel</Button>
          <Button
            onClick={handleResetPassword}
            variant="contained"
            color="primary"
            disabled={newPassword.length < 8}
            startIcon={<LockReset />}
          >
            Reset Password
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;