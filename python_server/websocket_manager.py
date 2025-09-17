"""
WebSocket Manager for real-time features
Handles WebSocket connections and real-time exam monitoring
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Any, Optional
import json
import asyncio
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manage WebSocket connections"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, List[str]] = {}  # user_id -> [connection_ids]
        self.connection_users: Dict[str, str] = {}  # connection_id -> user_id
        self.exam_rooms: Dict[str, List[str]] = {}  # exam_id -> [connection_ids]
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept a WebSocket connection"""
        await websocket.accept()
        
        connection_id = f"{user_id}_{id(websocket)}"
        self.active_connections[connection_id] = websocket
        self.connection_users[connection_id] = user_id
        
        # Track user connections
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(connection_id)
        
        logger.info(f"WebSocket connection established for user {user_id}")
    
    async def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove a WebSocket connection"""
        connection_id = f"{user_id}_{id(websocket)}"
        
        # Remove from active connections
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        
        # Remove from user connections
        if user_id in self.user_connections:
            if connection_id in self.user_connections[user_id]:
                self.user_connections[user_id].remove(connection_id)
            
            # Clean up empty user connection list
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        
        # Remove from connection users
        if connection_id in self.connection_users:
            del self.connection_users[connection_id]
        
        # Remove from exam rooms
        for exam_id, connections in self.exam_rooms.items():
            if connection_id in connections:
                connections.remove(connection_id)
        
        logger.info(f"WebSocket connection closed for user {user_id}")
    
    async def send_personal_message(self, message: str, user_id: str):
        """Send message to specific user's connections"""
        if user_id in self.user_connections:
            for connection_id in self.user_connections[user_id]:
                websocket = self.active_connections.get(connection_id)
                if websocket:
                    try:
                        await websocket.send_text(message)
                    except Exception as e:
                        logger.error(f"Error sending message to user {user_id}: {e}")
                        # Remove dead connection
                        await self._remove_dead_connection(connection_id)
    
    async def send_to_exam_room(self, message: str, exam_id: str, exclude_user: str = None):
        """Send message to all users in an exam room"""
        if exam_id in self.exam_rooms:
            for connection_id in self.exam_rooms[exam_id].copy():
                user_id = self.connection_users.get(connection_id)
                if user_id and user_id != exclude_user:
                    websocket = self.active_connections.get(connection_id)
                    if websocket:
                        try:
                            await websocket.send_text(message)
                        except Exception as e:
                            logger.error(f"Error sending message to exam room {exam_id}: {e}")
                            # Remove dead connection
                            await self._remove_dead_connection(connection_id)
    
    async def join_exam_room(self, connection_id: str, exam_id: str):
        """Add connection to exam room"""
        if exam_id not in self.exam_rooms:
            self.exam_rooms[exam_id] = []
        
        if connection_id not in self.exam_rooms[exam_id]:
            self.exam_rooms[exam_id].append(connection_id)
            
            user_id = self.connection_users.get(connection_id)
            logger.info(f"User {user_id} joined exam room {exam_id}")
    
    async def leave_exam_room(self, connection_id: str, exam_id: str):
        """Remove connection from exam room"""
        if exam_id in self.exam_rooms and connection_id in self.exam_rooms[exam_id]:
            self.exam_rooms[exam_id].remove(connection_id)
            
            user_id = self.connection_users.get(connection_id)
            logger.info(f"User {user_id} left exam room {exam_id}")
    
    async def broadcast(self, message: str):
        """Broadcast message to all connections"""
        dead_connections = []
        
        for connection_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to connection {connection_id}: {e}")
                dead_connections.append(connection_id)
        
        # Clean up dead connections
        for connection_id in dead_connections:
            await self._remove_dead_connection(connection_id)
    
    async def _remove_dead_connection(self, connection_id: str):
        """Remove a dead connection from all tracking structures"""
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        
        user_id = self.connection_users.get(connection_id)
        if user_id and user_id in self.user_connections:
            if connection_id in self.user_connections[user_id]:
                self.user_connections[user_id].remove(connection_id)
            
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        
        if connection_id in self.connection_users:
            del self.connection_users[connection_id]
        
        # Remove from all exam rooms
        for connections in self.exam_rooms.values():
            if connection_id in connections:
                connections.remove(connection_id)
    
    async def handle_message(self, websocket: WebSocket, data: str):
        """Handle incoming WebSocket message"""
        try:
            message = json.loads(data)
            message_type = message.get("type")
            connection_id = None
            
            # Find connection ID for this websocket
            for conn_id, ws in self.active_connections.items():
                if ws == websocket:
                    connection_id = conn_id
                    break
            
            if not connection_id:
                logger.error("Could not find connection ID for WebSocket")
                return
            
            user_id = self.connection_users.get(connection_id)
            
            if message_type == "join_exam":
                exam_id = message.get("exam_id")
                if exam_id:
                    await self.join_exam_room(connection_id, exam_id)
                    await websocket.send_text(json.dumps({
                        "type": "exam_joined",
                        "exam_id": exam_id
                    }))
            
            elif message_type == "leave_exam":
                exam_id = message.get("exam_id")
                if exam_id:
                    await self.leave_exam_room(connection_id, exam_id)
                    await websocket.send_text(json.dumps({
                        "type": "exam_left",
                        "exam_id": exam_id
                    }))
            
            elif message_type == "exam_update":
                # Instructor updating exam during live session
                exam_id = message.get("exam_id")
                update_data = message.get("data")
                
                if exam_id and update_data:
                    # Broadcast to all users in exam room
                    await self.send_to_exam_room(
                        json.dumps({
                            "type": "exam_updated",
                            "exam_id": exam_id,
                            "data": update_data
                        }),
                        exam_id,
                        exclude_user=user_id
                    )
            
            elif message_type == "timer_sync":
                # Sync timer across all exam participants
                exam_id = message.get("exam_id")
                timer_data = message.get("timer_data")
                
                if exam_id and timer_data:
                    await self.send_to_exam_room(
                        json.dumps({
                            "type": "timer_update",
                            "exam_id": exam_id,
                            "timer_data": timer_data
                        }),
                        exam_id,
                        exclude_user=user_id
                    )
            
            elif message_type == "ping":
                # Keep-alive ping
                await websocket.send_text(json.dumps({"type": "pong"}))
            
            else:
                logger.warning(f"Unknown message type: {message_type}")
        
        except json.JSONDecodeError:
            logger.error("Invalid JSON received in WebSocket message")
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        return {
            "total_connections": len(self.active_connections),
            "unique_users": len(self.user_connections),
            "exam_rooms": len(self.exam_rooms),
            "connections_per_room": {
                exam_id: len(connections) 
                for exam_id, connections in self.exam_rooms.items()
            }
        }

# Global connection manager
manager = ConnectionManager()