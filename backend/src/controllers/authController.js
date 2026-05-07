const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET is not defined in backend/.env');
}

exports.register = async (req, res) => {
  try {
    console.log('[AUTH] Incoming registration request body:', req.body);
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      console.log('[AUTH] Validation failed: Missing fields');
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    if (password.length < 6) {
      console.log('[AUTH] Validation failed: Password too short');
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('[AUTH] Validation failed: Email already exists', email);
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      passwordHash: hashedPassword,
      role: role && ['teacher', 'student'].includes(role) ? role : 'student'
    });

    console.log('[AUTH] Saving new user to MongoDB...');
    await user.save();
    console.log('[AUTH] User saved successfully. Generating JWT...');

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    console.log('[AUTH] Registration complete for user:', user.email);
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: { userId: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('[AUTH] Registration exception caught:', err);
    res.status(500).json({ success: false, message: `Server error during registration: ${err.message}` });
  }
};

exports.login = async (req, res) => {
  try {
    console.log('[AUTH] Incoming login request for email:', req.body.email);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log('[AUTH] Login failed: User not found for email:', email);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Do NOT log the passwordHash directly in production, but we check if it looks hashed
    const bcrypt = require('bcryptjs');
    let isMatch = false;

    // Detect if the stored password is plain text
    // bcrypt hashes typically start with $2a$, $2b$, or $2y$ and are 60 chars long
    const isHashed = user.passwordHash && user.passwordHash.startsWith('$2') && user.passwordHash.length === 60;

    if (!isHashed) {
      console.log('[AUTH] Plaintext password detected. Running safe migration check...');
      if (user.passwordHash === password) {
        isMatch = true;
        // Hash it and save it back
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(password, salt);
        await user.save();
        console.log('[AUTH] Successfully migrated plaintext password for user:', user.email);
      }
    } else {
      isMatch = await bcrypt.compare(password, user.passwordHash);
    }

    if (!isMatch) {
      console.log('[AUTH] Login failed: Incorrect password attempt for email:', email);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    console.log('[AUTH] Login successful for user:', user.email);
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: { userId: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('[AUTH] Login exception caught:', err);
    res.status(500).json({ success: false, message: `Server error during login: ${err.message}` });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    res.status(200).json({ 
      success: true, 
      user: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('[AUTH] Get user error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new passwords' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.passwordHash = hashedPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('[AUTH] Change password error:', err);
    res.status(500).json({ success: false, message: 'Server error during password update' });
  }
};
