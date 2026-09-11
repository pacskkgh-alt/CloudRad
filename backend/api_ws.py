"""
api_ws.py — Real-time WebSocket notification server.

Broadcasts events to authenticated doctors:
  • new_case   — new Telerad study uploaded
  • new_consultation — incoming second opinion request
  • ping       — heartbeat (every 30s, keeps connections alive)
"""
import asyncio
import logging
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException, status
from jose import JWTError
from auth import decode_token

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])

# doctor_id → set of active WebSocket connections (one doctor can have multiple tabs)
_connections: Dict[str, Set[WebSocket]] = {}


class ConnectionManager:
    """Manages WebSocket lifecycle and broadcasting."""

    async def connect(self, doctor_id: str, ws: WebSocket):
        await ws.accept()
        if doctor_id not in _connections:
            _connections[doctor_id] = set()
        _connections[doctor_id].add(ws)
        logger.info(f"WS connected: doctor={doctor_id}, total_sockets={len(_connections[doctor_id])}")

    def disconnect(self, doctor_id: str, ws: WebSocket):
        if doctor_id in _connections:
            _connections[doctor_id].discard(ws)
            if not _connections[doctor_id]:
                del _connections[doctor_id]
        logger.info(f"WS disconnected: doctor={doctor_id}")

    async def send_to_doctor(self, doctor_id: str, message: dict):
        """Send a JSON message to all sessions of a specific doctor."""
        if doctor_id not in _connections:
            return
        dead = set()
        for ws in list(_connections[doctor_id]):
            try:
                await ws.send_json(message)
            except Exception:
                dead.add(ws)
        for ws in dead:
            _connections[doctor_id].discard(ws)

    async def broadcast(self, message: dict, exclude_doctor: str = None):
        """Broadcast to ALL connected doctors (e.g., new unassigned STAT case)."""
        for doctor_id, sockets in list(_connections.items()):
            if doctor_id == exclude_doctor:
                continue
            for ws in list(sockets):
                try:
                    await ws.send_json(message)
                except Exception:
                    pass


manager = ConnectionManager()


@router.websocket("/ws/notifications")
async def websocket_notifications(
    ws: WebSocket,
    token: str = Query(..., description="JWT access token"),
):
    """
    WebSocket endpoint for real-time notifications.

    Connection: ws://host/ws/notifications?token=<jwt>

    Server → Client messages:
      { "type": "ping" }
      { "type": "new_case", "modality": "CT", "priority": "stat", "study_id": "..." }
      { "type": "new_consultation", "from_doctor": "Dr. Ahmed", "study_id": "..." }
    """
    # ─── Authenticate ───────────────────────────────────────────────────────────
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            await ws.close(code=4001)
            return
        doctor_id = payload.get("sub")
        if not doctor_id:
            await ws.close(code=4001)
            return
    except JWTError:
        await ws.close(code=4001)
        return

    await manager.connect(doctor_id, ws)
    try:
        # Send welcome message
        await ws.send_json({"type": "connected", "doctor_id": doctor_id})

        # Heartbeat loop + receive messages from client
        while True:
            try:
                # Wait for a client message with a timeout for ping
                data = await asyncio.wait_for(ws.receive_text(), timeout=30.0)
                # Client can send { "type": "ping" } to keep alive
                if data:
                    await ws.send_json({"type": "pong"})
            except asyncio.TimeoutError:
                # Send server-initiated ping to keep connection alive
                await ws.send_json({"type": "ping"})

    except WebSocketDisconnect:
        manager.disconnect(doctor_id, ws)
    except Exception as e:
        logger.error(f"WebSocket error for doctor={doctor_id}: {e}")
        manager.disconnect(doctor_id, ws)
