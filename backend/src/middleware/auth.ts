import { FastifyRequest, FastifyReply } from 'fastify';
import { getUserFromToken, verifyAdmin } from '../utils/supabase.js';
import { supabaseAdmin } from '../utils/supabase.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      role?: string;
    };
    userId?: string;
  }
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7);
    const user = await getUserFromToken(token);

    // Get user from database
    const { data: dbUser, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single();

    if (error || !dbUser) {
      return reply.status(401).send({
        error: 'User not found',
      });
    }

    // Check if user is active
    if (dbUser.is_active === false) {
      return reply.status(403).send({
        error: 'Account is suspended or banned',
      });
    }

    // Attach user to request
    request.user = {
      id: dbUser.id,
      email: dbUser.email,
      role: user.user_metadata?.role,
    };
    request.userId = dbUser.id;
  } catch (error) {
    request.log.error({ error }, 'Auth middleware error');
    return reply.status(401).send({
      error: 'Invalid or expired token',
    });
  }
}

/**
 * Middleware to verify admin access
 */
export async function adminMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7);
    const isAdmin = await verifyAdmin(token);

    if (!isAdmin) {
      return reply.status(403).send({
        error: 'Admin access required',
      });
    }

    const user = await getUserFromToken(token);
    request.user = {
      id: user.id,
      email: user.email!,
      role: 'admin',
    };
  } catch (error) {
    request.log.error({ error }, 'Admin middleware error');
    return reply.status(401).send({
      error: 'Invalid or expired token',
    });
  }
}

