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
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  TablePagination,
  Alert,
  InputAdornment,
} from '@mui/material';
import { Search, Check, Close } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { format } from 'date-fns';

interface AuditLog {
  id: number;
  userId: number;
  userEmail: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  status: 'success' | 'failure';
  details: any;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export const AuditLogs: React.FC = () => {
  const { hasPermission } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    action: '',
    status: '',
    userEmail: '',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value) acc[key] = value;
          return acc;
        }, {} as any),
      });
      
      const response = await api.get(`/audit/logs?${params}`);
      setLogs(response.data.logs || []);
      setTotalCount(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'success';
    if (action.includes('update')) return 'info';
    if (action.includes('delete')) return 'error';
    if (action.includes('login')) return 'primary';
    return 'default';
  };

  const getStatusIcon = (status: string) => {
    return status === 'success' ? 
      <Check sx={{ color: 'green', fontSize: 20 }} /> : 
      <Close sx={{ color: 'red', fontSize: 20 }} />;
  };

  if (!hasPermission('audit', 'read')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">You don't have permission to view audit logs</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Audit Logs
        </Typography>
        
        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            label="Search by User"
            value={filters.userEmail}
            onChange={(e) => setFilters({ ...filters, userEmail: e.target.value })}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Action</InputLabel>
            <Select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              label="Action"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="login">Login</MenuItem>
              <MenuItem value="logout">Logout</MenuItem>
              <MenuItem value="campaign.create">Campaign Create</MenuItem>
              <MenuItem value="user.create">User Create</MenuItem>
              <MenuItem value="user.update">User Update</MenuItem>
              <MenuItem value="user.delete">User Delete</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              label="Status"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="success">Success</MenuItem>
              <MenuItem value="failure">Failure</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="Date From"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          
          <TextField
            label="Date To"
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Resource</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>IP Address</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                  </TableCell>
                  <TableCell>{log.userEmail}</TableCell>
                  <TableCell>
                    <Chip 
                      label={log.action} 
                      size="small" 
                      color={getActionColor(log.action) as any}
                    />
                  </TableCell>
                  <TableCell>
                    {log.resourceType && (
                      <Typography variant="caption">
                        {log.resourceType}{log.resourceId && `: ${log.resourceId}`}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{getStatusIcon(log.status)}</TableCell>
                  <TableCell>
                    <Typography variant="caption">{log.ipAddress}</Typography>
                  </TableCell>
                  <TableCell>
                    {log.details && (
                      <Typography variant="caption" sx={{ 
                        maxWidth: 200, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
};

export default AuditLogs;