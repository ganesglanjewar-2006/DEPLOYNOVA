const jwt = require('jsonwebtoken');

exports.protect = async (req, res, next) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        // For development/demo purposes in Stage 3, if no token, assume a default demo user
        req.user = { id: '000000000000000000000000', name: 'Demo User' };
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ success: false, error: 'Not authorized' });
    }
};
