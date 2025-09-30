const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User, Role, FacebookAuth } = require('../models');
const { authenticate } = require('../middleware/auth');
const AuditService = require('../services/AuditService');
const { body, validationResult } = require('express-validator');

// Register new user
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = await User.create({
      email,
      password,
      firstName,
      lastName
    });

    // Assign default role (media_buyer)
    const mediaBuyerRole = await Role.findOne({ where: { name: 'media_buyer' } });
    if (mediaBuyerRole) {
      await user.addRole(mediaBuyerRole);
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    await AuditService.logRequest(req, 'user.register', 'user', user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    await AuditService.logRequest(req, 'user.register', null, null, 'failure', error.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ 
      where: { email },
      include: [{
        model: Role,
        as: 'roles',
        attributes: ['id', 'name']
      }]
    });

    if (!user) {
      await AuditService.logRequest(req, 'user.login', null, null, 'failure', 'Invalid credentials');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      await AuditService.logRequest(req, 'user.login', 'user', user.id, 'failure', 'Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      await AuditService.logRequest(req, 'user.login', 'user', user.id, 'failure', 'Account deactivated');
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    await user.update({ lastLogin: new Date() });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Add userId to request for audit logging
    req.userId = user.id;
    await AuditService.logRequest(req, 'user.login', 'user', user.id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles.map(r => r.name)
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    await AuditService.logRequest(req, 'user.login', null, null, 'failure', error.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: ['id', 'email', 'firstName', 'lastName', 'isActive', 'lastLogin'],
      include: [{
        model: Role,
        as: 'roles',
        attributes: ['id', 'name', 'description']
      }]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        roles: user.roles
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

// Update password
router.put('/password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findByPk(req.userId);
    const isValidPassword = await user.validatePassword(currentPassword);
    
    if (!isValidPassword) {
      await AuditService.logRequest(req, 'user.changePassword', 'user', req.userId, 'failure', 'Invalid current password');
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    await AuditService.logRequest(req, 'user.changePassword', 'user', req.userId);

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Password update error:', error);
    await AuditService.logRequest(req, 'user.changePassword', 'user', req.userId, 'failure', error.message);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Logout (just for audit logging)
router.post('/logout', authenticate, async (req, res) => {
  try {
    if (req.userId) {
      await AuditService.logRequest(req, 'user.logout', 'user', req.userId);
    }
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get Facebook authentication status
router.get('/facebook/status', authenticate, async (req, res) => {
  try {
    const facebookAuth = await FacebookAuth.findOne({
      where: { userId: req.userId },
      attributes: ['id', 'facebookUserId', 'tokenExpiresAt', 'isActive', 'pages']
    });

    if (!facebookAuth) {
      return res.json({
        success: true,
        connected: false,
        message: 'No Facebook account connected'
      });
    }

    // Check if token is still valid
    const isExpired = facebookAuth.tokenExpiresAt && new Date(facebookAuth.tokenExpiresAt) < new Date();
    const isConnected = facebookAuth.isActive && !isExpired;

    // Get user name from pages data (first page name as fallback)
    let userName = 'Facebook User';
    if (facebookAuth.pages && facebookAuth.pages.length > 0) {
      userName = facebookAuth.pages[0].name || 'Facebook User';
    }

    res.json({
      success: true,
      connected: isConnected,
      facebookUser: isConnected ? {
        id: facebookAuth.facebookUserId,
        name: userName
      } : null,
      expiresAt: facebookAuth.tokenExpiresAt,
      message: isConnected ? 'Facebook account connected' : 'Facebook connection expired or invalid'
    });
  } catch (error) {
    console.error('Facebook status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Facebook status'
    });
  }
});

module.exports = router;