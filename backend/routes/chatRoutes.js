import express from 'express'
const router = express.Router()

import { chatWithAI } from '../controllers/chatController.js'

// ═══════════════ B2: AI Chatbot tư vấn sản phẩm ═══════════════
// Public — không cần đăng nhập để chat với AI tư vấn sản phẩm
router.post('/', chatWithAI)

export default router