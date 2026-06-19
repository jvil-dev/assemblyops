/**
 * Congregation Resolvers
 *
 * Handles congregation queries for volunteer management.
 *
 * Queries:
 *   - congregations: Get congregations by state (optionally filtered by language)
 *   - congregationsByCircuit: Get all congregations in a circuit
 *   - congregation: Get a single congregation by ID
 *
 * Type Resolvers:
 *   - Congregation.circuit: Get the circuit this congregation belongs to
 *   - Congregation.volunteerProfiles: Get all volunteer profiles in this congregation
 *
 * Schema: ../schema/congregation.ts
 */
import { Context } from '../context.js';
import { Congregation } from '@prisma/client';
import { requireAuth } from '../guards/auth.js';

const congregationResolvers = {
  Query: {
    congregations: async (
      _parent: unknown,
      args: { state: string; language?: string },
      context: Context
    ): Promise<Congregation[]> => {
      requireAuth(context);
      return context.prisma.congregation.findMany({
        where: {
          state: args.state,
          ...(args.language && { language: args.language }),
        },
        orderBy: { name: 'asc' },
      });
    },

    congregationsByCircuit: async (
      _parent: unknown,
      { circuitId }: { circuitId: string },
      context: Context
    ): Promise<Congregation[]> => {
      requireAuth(context);
      return context.prisma.congregation.findMany({
        where: { circuitId },
        orderBy: { name: 'asc' },
      });
    },

    congregation: async (
      _parent: unknown,
      { id }: { id: string },
      context: Context
    ): Promise<Congregation | null> => {
      requireAuth(context);
      return context.prisma.congregation.findUnique({
        where: { id },
      });
    },

    searchCongregations: async (
      _parent: unknown,
      { query }: { query: string },
      context: Context
    ): Promise<Congregation[]> => {
      // No auth required — used during registration before user is logged in
      const trimmed = query.trim();
      if (trimmed.length < 3) return [];
      return context.prisma.congregation.findMany({
        where: {
          name: { contains: trimmed, mode: 'insensitive' },
        },
        orderBy: [{ name: 'asc' }],
        take: 20,
      });
    },
  },

  Congregation: {
    circuit: async (congregation: Congregation, _args: unknown, context: Context) => {
      // circuitId is nullable; unlinked congregations resolve to no circuit
      if (!congregation.circuitId) {
        return null;
      }
      return context.prisma.circuit.findUnique({
        where: { id: congregation.circuitId },
      });
    },

    users: async (congregation: Congregation, _args: unknown, context: Context) => {
      return context.prisma.user.findMany({
        where: { congregationId: congregation.id },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });
    },
  },
};

export default congregationResolvers;
