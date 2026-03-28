const router = require('express').Router();
const { 
    createRule, 
    getRules, 
    updateRule, 
    deleteRule, 
    getLogs 
} = require('../controllers/ruleController');

const { protect } = require('../middleware/authMiddleware');

// 🔒 All routes require auth (fallback to demo user if no token)
router.use(protect);

router.post('/', createRule);
router.get('/', getRules);
router.put('/:id', updateRule);
router.delete('/:id', deleteRule);
router.get('/logs', getLogs);

module.exports = router;
