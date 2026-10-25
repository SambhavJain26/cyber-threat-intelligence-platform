import 'dotenv/config';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_key_change_in_production_32chars';

export interface AuthRequest extends Request {
  userId?: string;
  username?: string;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const secret = process.env.JWT_SECRET || JWT_SECRET;
  try {
    const decoded = jwt.verify(token, secret) as { userId: string; username: string };
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function generateToken(userId: string, username: string): string {
  const secret = process.env.JWT_SECRET || JWT_SECRET;
  return jwt.sign({ userId, username }, secret, { expiresIn: '7d' });
}
