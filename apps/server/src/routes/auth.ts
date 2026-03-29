import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { AppDataSource } from '../data-source';
import { UserEntity } from '../entities/User';
import { signToken, AuthRequest } from '../middleware/auth';

const router: Router = Router();
const userRepo = () => AppDataSource.getRepository(UserEntity);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

router.post('/login', async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await userRepo().findOneBy({ email: body.email });
    if (!user) { res.status(401).json({ error: 'Invalid credentials' }); return; }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) { res.status(401).json({ error: 'Invalid credentials' }); return; }

    const token = signToken({ id: user.id, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);
    const existing = await userRepo().findOneBy({ email: body.email });
    if (existing) { res.status(409).json({ error: 'Email already registered' }); return; }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = userRepo().create({ email: body.email, passwordHash, name: body.name });
    await userRepo().save(user);

    const token = signToken({ id: user.id, email: user.email });
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  res.json(authReq.user);
});

export { router as authRouter };
