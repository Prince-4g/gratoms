const { Admin } = require('../../model');
const authUtils = require("../../utils/authUtils");
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

function AdminAuthController() {
  return {
    register: async function(req, res) {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password, role = 'admin' } = req.body;

        // Check if maximum admin limit reached (3 admins)
        const adminCount = await Admin.count();
        if (adminCount >= 3) {
          return res.status(403).json({ 
            error: 'Maximum admin limit reached (3 admins maximum)' 
          });
        }

        // Check if username or email already exists
        const existingAdmin = await Admin.findOne({
          where: {
            [Op.or]: [{ username }, { email }]
          }
        });

        if (existingAdmin) {
          return res.status(400).json({ 
            error: 'Username or email already exists' 
          });
        }

        // Hash password
        const hashedPassword = await authUtils.hashPassword(password);

        // Create admin
        const admin = await Admin.create({
          username,
          email,
          password: hashedPassword,
          role
        });

        // Generate token
        const token = authUtils.generateToken({
            id: admin.id,
            username: admin.username,
            role: admin.role
        });
        
        // Remove password from response
        const adminResponse = admin.toJSON();
        delete adminResponse.password;

        return res.status(201).json({
          success: true,
          message: 'Admin registered successfully',
          admin: adminResponse,
          token
        });

      } catch (error) {
        console.error('Admin registration error:', error);
        return res.status(500).json({ error: 'Failed to register admin' });
      }
    },

    login: async function(req, res) {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { email, username,password } = req.body;
        console.log(email, password)
        // Find admin
        const admin = await Admin.findOne({
          // where: { email }
          [Op.or]: [{ username }, { email }]

        });

        if (!admin) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!admin.is_active) {
          return res.status(401).json({ error: 'Admin account is deactivated' });
        }

        // Check password
        const isMatch = await authUtils.comparePassword(password, admin.password);
        
        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        
        const token = authUtils.generateToken({
          id: admin.id,
          username: admin.username,
          role: admin.role
        });

        // Remove password from response
        const adminResponse = admin.toJSON();
        delete adminResponse.password;

        return res.json({
          success: true,
          message: 'Login successful',
          admin: adminResponse,
          token
        });

      } catch (error) {
        console.error('Admin login error:', error);
        return res.status(500).json({ error: 'Login failed' });
      }
    },

    getAdminProfile: async function(req, res) {
      try {
        const admin = await Admin.findByPk(req.admin.adminId, {
          attributes: { exclude: ['password'] }
        });
        
        return res.json({ admin });
      } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch admin profile' });
      }
    },

    getAllAdmins: async function(req, res) {
      try {
        const admins = await Admin.findAll({
          attributes: { exclude: ['password'] },
          order: [['createdAt', 'DESC']]
        });

        return res.json({ admins, total: admins.length });
      } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch admins' });
      }
    },
    
  };
}

module.exports = AdminAuthController;