import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    const { room, index, deleteRoom, action } = req.query;
    if (!room) return res.status(400).json({ error: "System Breach: Room ID missing" });

    const key = `room:${room}`;

    try {
        // =====================
        // READ OPERATIONS
        // =====================
        if (req.method === "GET") {
            const data = await kv.get(key);
            // If checking a room exists or just fetching history
            if (action === "exists") return res.status(200).json({ exists: !!data });
            return res.status(200).json(data || []);
        }

        // =====================
        // WRITE OPERATIONS
        // =====================
        if (req.method === "POST") {
            const { user, text, type, metadata } = req.body;
            if (!user || !text) return res.status(400).json({ error: "Payload incomplete" });

            const history = (await kv.get(key)) || [];
            
            const packet = {
                id: Math.random().toString(36).substr(2, 9),
                user,
                text,
                type: type || 'text',
                metadata: metadata || {},
                timestamp: Date.now(),
                time: new Date().toLocaleTimeString([], { 
                    hour: "2-digit", 
                    minute: "2-digit", 
                    second: "2-digit" 
                })
            };

            history.push(packet);
            // Keep the buffer optimized at 150 messages for P.OS performance
            await kv.set(key, history.slice(-150));
            return res.status(201).json(packet);
        }

        // =====================
        // DELETE OPERATIONS
        // =====================
        if (req.method === "DELETE") {
            // Delete specific packet by index
            if (index !== undefined) {
                const history = (await kv.get(key)) || [];
                history.splice(index, 1);
                await kv.set(key, history);
                return res.status(200).json({ status: "Packet purged" });
            }

            // Master List Contact Cleanup
            if (room === "MASTER_LIST" && deleteRoom) {
                const master = (await kv.get("room:MASTER_LIST")) || [];
                const updated = master.filter(m => !m.text.includes(deleteRoom));
                await kv.set("room:MASTER_LIST", updated);
                await kv.del(`room:${deleteRoom}`); 
                return res.status(200).json({ status: "Node de-registered" });
            }

            // Wipe entire room
            await kv.del(key);
            return res.status(200).json({ status: "Channel Terminated" });
        }

        return res.status(405).json({ error: "Protocol not supported" });

    } catch (err) {
        console.error("Critical System Error:", err);
        return res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
}
