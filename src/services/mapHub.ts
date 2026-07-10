import * as signalR from '@microsoft/signalr';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HUB_URL = 'https://beexe-production.up.railway.app/hubs/map';

type MapPostCreatedHandler = (payload: Record<string, unknown>) => void;
type MapPostDeletedHandler = (payload: { postId: string }) => void;

let connection: signalR.HubConnection | null = null;
let starting: Promise<signalR.HubConnection> | null = null;
let lastMapAreaKey: string | null = null;

const mapPostCreatedHandlers = new Set<MapPostCreatedHandler>();
const mapPostDeletedHandlers = new Set<MapPostDeletedHandler>();

function wireConnection(conn: signalR.HubConnection) {
  conn.off('MapPostCreated');
  conn.off('MapPostDeleted');

  conn.on('MapPostCreated', (raw: Record<string, unknown>) => {
    mapPostCreatedHandlers.forEach(handler => handler(raw));
  });

  conn.on('MapPostDeleted', (raw: { postId?: string; PostId?: string }) => {
    const postId = String(raw.postId || raw.PostId || '');
    if (!postId) return;
    mapPostDeletedHandlers.forEach(handler => handler({ postId }));
  });
}

export async function ensureMapHubConnected(): Promise<signalR.HubConnection> {
  if (connection?.state === signalR.HubConnectionState.Connected) {
    return connection;
  }

  if (starting) return starting;

  starting = (async () => {
    const token = await AsyncStorage.getItem('mymo.accessToken');
    if (!token) throw new Error('Not authenticated');

    if (connection) {
      try { await connection.stop(); } catch { /* ignore */ }
    }

    connection = new signalR.HubConnectionBuilder()
      .withUrl(`${HUB_URL}?access_token=${encodeURIComponent(token)}`, {
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
        skipNegotiation: false,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .build();

    wireConnection(connection);
    await connection.start();
    lastMapAreaKey = null;
    return connection;
  })();

  try {
    return await starting;
  } finally {
    starting = null;
  }
}

export async function updateMapArea(lat: number, lng: number): Promise<void> {
  const areaKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  if (lastMapAreaKey === areaKey) return;

  const conn = await ensureMapHubConnected();
  await conn.invoke('UpdateMapArea', lat, lng);
  lastMapAreaKey = areaKey;
}

export async function disconnectMapHub(): Promise<void> {
  if (!connection) return;
  try { await connection.stop(); } catch { /* ignore */ }
  connection = null;
  lastMapAreaKey = null;
}

export function onMapPostCreated(handler: MapPostCreatedHandler): () => void {
  mapPostCreatedHandlers.add(handler);
  return () => mapPostCreatedHandlers.delete(handler);
}

export function onMapPostDeleted(handler: MapPostDeletedHandler): () => void {
  mapPostDeletedHandlers.add(handler);
  return () => mapPostDeletedHandlers.delete(handler);
}

export default {
  ensureMapHubConnected,
  updateMapArea,
  disconnectMapHub,
  onMapPostCreated,
  onMapPostDeleted,
};
