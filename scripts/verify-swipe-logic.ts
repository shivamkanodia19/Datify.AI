
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env file if it exists
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

// Fallback to hardcoded values if not in env (matching src/lib/supabaseClient.ts)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://yxyngiirdiksakmodhuu.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4eW5naWlyZGlrc2FrbW9kaHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MzU0ODgsImV4cCI6MjA3ODExMTQ4OH0.EotRH0kKJCPSaAAAb9qGZB6wgXywpePlI0j_7idIhAI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runVerification() {
    console.log('Starting swipe logic verification...');

    // 1. Sign up test users
    const userIds: string[] = [];
    const userClients: any[] = [];

    for (let i = 0; i < 3; i++) {
        const email = `test-${Date.now()}-${i}@example.com`;
        const password = 'password123';

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError || !authData.user) {
            console.error(`Failed to sign up user ${i}:`, authError);
            return;
        }

        console.log(`Signed up user ${i}:`, authData.user.id);
        userIds.push(authData.user.id);

        const userClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
            global: { headers: { Authorization: `Bearer ${authData.session?.access_token}` } }
        });
        userClients.push(userClient);
    }

    // 2. Create a test session (User 1 creates it)
    const { data: session, error: sessionError } = await userClients[0]
        .from('sessions')
        .insert({
            session_type: 'group',
            status: 'active',
            created_by: userIds[0],
            session_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
            start_address: '123 Test St, Test City, TC 12345'
        })
        .select()
        .single();

    if (sessionError || !session) {
        console.error('Failed to create session:', sessionError);
        return;
    }
    console.log('Created session:', session.id);

    // 3. Add participants
    // Host (User 0) is already added by trigger (or should be).
    // Users 1 and 2 join via code.
    const sessionCode = session.session_code;

    for (let i = 1; i < 3; i++) {
        const { data: joinData, error: joinError } = await userClients[i]
            .rpc('join_session_with_code', { code: sessionCode });

        if (joinError) {
            console.error(`User ${i} failed to join:`, joinError);
            return;
        }
        console.log(`User ${i} joined session`);
    }
    console.log('All participants joined');

    // 4. Define places
    const places = [
        { id: 'place-A', name: 'Place A (Unanimous)' },
        { id: 'place-B', name: 'Place B (2/3)' },
        { id: 'place-C', name: 'Place C (1/3)' },
        { id: 'place-D', name: 'Place D (0/3)' },
        { id: 'place-E', name: 'Place E (1/3)' } // Added to ensure > 2 advancing if needed
    ];
    const placeIds = places.map(p => p.id);

    // 5. Simulate swipes
    // Place A: All 3 swipe right
    await swipeWithClients(session.id, 'place-A', userClients, userIds, [0, 1, 2], 'right');

    // Place B: 2 swipe right
    await swipeWithClients(session.id, 'place-B', userClients, userIds, [0, 1], 'right');
    await swipeWithClients(session.id, 'place-B', userClients, userIds, [2], 'left');

    // Place C: 1 swipe right
    await swipeWithClients(session.id, 'place-C', userClients, userIds, [0], 'right');
    await swipeWithClients(session.id, 'place-C', userClients, userIds, [1, 2], 'left');

    // Place D: 0 swipe right
    await swipeWithClients(session.id, 'place-D', userClients, userIds, [0, 1, 2], 'left');

    // Place E: 1 swipe right
    await swipeWithClients(session.id, 'place-E', userClients, userIds, [1], 'right');
    await swipeWithClients(session.id, 'place-E', userClients, userIds, [0, 2], 'left');
    // 6. Check round completion (Using host client)
    const { data: result, error: rpcError } = await userClients[0].rpc('check_and_complete_round', {
        p_session_id: session.id,
        p_deck_place_ids: placeIds,
        p_round_number: 1,
        p_expected_version: null
    });

    if (rpcError) {
        console.error('RPC Error:', rpcError);
        return;
    }

    console.log('Round Completion Result:', JSON.stringify(result, null, 2));

    // 7. Verify Logic
    const r = result as any;
    let success = true;

    // Check Unanimous
    if (!r.unanimous_matches.includes('place-A')) {
        console.error('FAILURE: Place A should be unanimous');
        success = false;
    }

    // Check Advancing (B, C, E)
    const advancingIds = r.advancing_places.map((p: any) => p.place_id);
    if (!advancingIds.includes('place-B') || !advancingIds.includes('place-C') || !advancingIds.includes('place-E')) {
        console.error('FAILURE: Places B, C, E should be advancing');
        console.error('Actual advancing:', advancingIds);
        success = false;
    }
    if (advancingIds.includes('place-D')) {
        console.error('FAILURE: Place D should NOT be advancing');
        success = false;
    }

    // Check Eliminated
    if (!r.eliminated_place_ids.includes('place-D')) {
        console.error('FAILURE: Place D should be eliminated');
        success = false;
    }

    // Check Next Action
    // We have 3 advancing places (B, C, E). Logic: > 2 -> nextRound.
    if (r.next_action !== 'nextRound') {
        console.error(`FAILURE: Next action should be 'nextRound', got '${r.next_action}'`);
        success = false;
    }

    if (success) {
        console.log('SUCCESS: All checks passed!');
    } else {
        console.log('FAILURE: Some checks failed.');
    }
}

async function swipeWithClients(sessionId: string, placeId: string, clients: any[], userIds: string[], userIndices: number[], direction: 'left' | 'right') {
    for (const index of userIndices) {
        const client = clients[index];
        const userId = userIds[index];

        const { error } = await client.from('session_swipes').insert({
            session_id: sessionId,
            user_id: userId,
            place_id: placeId,
            direction: direction,
            round: 1,
            place_data: { id: placeId, name: 'Test Place' }
        });

        if (error) {
            console.error(`Failed to swipe for user ${index}:`, error);
        }
    }
}

runVerification();
