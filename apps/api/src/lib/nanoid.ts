/**
 * @file nanoid.ts
 * @description Generates short, URL-safe unique IDs for webhook endpoints.
 * Uses nanoid with a custom alphabet that avoids visually ambiguous characters
 * (0, O, I, l) to make IDs easier to read and share.
 *
 * Example output: "x7k2m9pq"
 *
 * Why not UUID?
 * UUIDs are 36 characters — too long for a URL that users will copy/paste.
 * 8 characters from our alphabet gives us 52^8 = ~53 trillion combinations,
 * more than enough to avoid collisions at our scale.
 */

import { customAlphabet } from 'nanoid';

// Removed visually ambiguous characters: 0, O, I, l, 1
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';

// 8 characters = ~53 trillion combinations
export const generateEndpointId = customAlphabet(ALPHABET, 8);
