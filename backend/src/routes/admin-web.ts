import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/env.js';
import { supabaseAdmin } from '../utils/supabase.js';

interface LoginRequest {
  Body: {
    email: string;
    password: string;
  };
}

export async function adminWebRoutes(fastify: FastifyInstance) {
  // Login page (public)
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.view('admin-login.ejs');
  });

  // Handle login form submission
  fastify.post('/login', async (request: FastifyRequest<LoginRequest>, reply: FastifyReply) => {
    try {
      const { email, password } = request.body;

      // Login via Supabase
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      // Check if user is admin
      if (data.user.email !== env.ADMIN_EMAIL) {
        return reply.status(403).send({ error: 'Admin access required' });
      }

      // Return session token
      return reply.send({
        success: true,
        token: data.session.access_token,
        user: {
          email: data.user.email,
        },
      });
    } catch (error) {
      request.log.error({ error }, 'Login error');
      return reply.status(500).send({ error: 'Login failed' });
    }
  });

  // Dashboard page (requires auth)
  fastify.get('/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get token from query param (passed from login redirect)
      const token = (request.query as any).token;

      if (!token) {
        return reply.redirect('/admin');
      }

      // Verify token and get user
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

      if (error || !user) {
        return reply.redirect('/admin');
      }

      // Check if user is admin
      if (user.email !== env.ADMIN_EMAIL) {
        return reply.status(403).send('Access denied. Admin access required.');
      }

      // Render dashboard with user info
      return reply.view('admin-dashboard.ejs', {
        userEmail: user.email,
        token: token,
      });
    } catch (error) {
      request.log.error({ error }, 'Dashboard error');
      return reply.redirect('/admin');
    }
  });

  // Logout
  fastify.get('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.redirect('/admin');
  });
}

