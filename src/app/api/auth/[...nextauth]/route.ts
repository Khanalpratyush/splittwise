import NextAuth from "next-auth";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import { User } from "@/models/User";
import connectDB from "@/lib/mongodb";
import logger from "@/utils/logger";

interface AuthError extends Error {
  type?: string;
  code?: string;
  message: string;
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          logger.auth('Starting authorization process');
          
          if (!credentials?.email || !credentials?.password) {
            logger.warn('Missing credentials');
            throw new Error('Invalid credentials');
          }

          await connectDB();
          logger.db('Connected to database for auth');

          const user = await User.findOne({ email: credentials.email });
          
          if (!user) {
            logger.warn(`No user found with email: ${credentials.email}`);
            throw new Error('Invalid credentials');
          }

          logger.debug('Found user', { userId: user._id, email: user.email });

          const isCorrectPassword = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isCorrectPassword) {
            logger.warn(`Invalid password for user: ${user.email}`);
            throw new Error('Invalid credentials');
          }

          logger.auth('User authenticated successfully', { userId: user._id });

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          logger.error('Error in authorize function', error);
          throw error;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      try {
        if (user) {
          logger.debug('Adding user data to JWT', { userId: user.id });
          token.id = user.id;
          token.email = user.email;
          token.name = user.name;
        }
        return token;
      } catch (error) {
        logger.error('Error in JWT callback', error);
        return token;
      }
    },
    async session({ session, token }) {
      try {
        if (token) {
          logger.debug('Adding token data to session', { userId: token.id });
          session.user.id = token.id as string;
          session.user.email = token.email as string;
          session.user.name = token.name as string;
        }
        return session;
      } catch (error) {
        logger.error('Error in session callback', error);
        return session;
      }
    }
  },
  events: {
    async signIn({ user }) {
      logger.auth('User signed in', { userId: user.id });
    },
    async signOut({ token }) {
      logger.auth('User signed out', { userId: token.id });
    },
    async error(error: AuthError) {
      logger.error('Authentication error', { 
        type: error.type, 
        code: error.code,
        message: error.message 
      });
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 