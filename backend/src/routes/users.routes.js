const express = require('express');
const { getUsers, createUser, updateUser, deleteUser } = require('../controllers/users.controller');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(verifyToken, requireAdmin);

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
