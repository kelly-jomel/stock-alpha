import { NextRequest, NextResponse } from 'next/server';
import { UserCloudData } from '@/types/sync';
import fs from 'fs';
import path from 'path';

// Server-side persistent storage directory (file-backed cloud store)
const DATA_DIR = path.join(process.cwd(), '.cloud_storage');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getUserFilePath(userId: string): string {
  // sanitize userId
  const cleanId = userId.replace(/[^a-zA-Z0-9_\-]/g, '_');
  return path.join(DATA_DIR, `user_${cleanId}.json`);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'local_user';
    const filePath = getUserFilePath(userId);

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data: UserCloudData = JSON.parse(content);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: true, data: null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientData: UserCloudData = await request.json();
    const userId = clientData.userId || 'local_user';
    const filePath = getUserFilePath(userId);

    let mergedData: UserCloudData = { ...clientData };

    if (fs.existsSync(filePath)) {
      try {
        const serverContent = fs.readFileSync(filePath, 'utf-8');
        const serverData: UserCloudData = JSON.parse(serverContent);

        // Merge logic: take union of watchlists, deduplicate drawings by id
        const mergedWatchlist = Array.from(new Set([...serverData.watchlist, ...clientData.watchlist]));
        
        const drawingsMap = new Map();
        serverData.drawings.forEach(d => drawingsMap.set(d.id, d));
        clientData.drawings.forEach(d => drawingsMap.set(d.id, d)); // client newer

        mergedData = {
          ...serverData,
          ...clientData,
          watchlist: mergedWatchlist,
          drawings: Array.from(drawingsMap.values()),
          lastSyncedAt: Date.now()
        };
      } catch (err) {
        console.warn('Failed to parse existing server data, overwriting:', err);
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(mergedData, null, 2), 'utf-8');

    return NextResponse.json({ success: true, data: mergedData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
