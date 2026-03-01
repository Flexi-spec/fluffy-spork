import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const { room, index, deleteRoom } = req.query;

  if (!room) {
    return res.status(400).json({ error: "Room ID required" });
  }

  const key = `room:${room}`;

  // =====================
  // GET MESSAGES
  // =====================
  if (req.method === "GET") {
    const data = await kv.get(key);

    if (!data) {
      return res.status(404).json({ error: "Room not found" });
    }

    return res.status(200).json(data);
  }

  // =====================
  // POST MESSAGE
  // =====================
  if (req.method === "POST") {
    const { user, text } = req.body;

    if (!user || !text) {
      return res.status(400).json({ error: "Invalid message" });
    }

    const history = (await kv.get(key)) || [];

    const msg = {
      user,
      text,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    history.push(msg);

    await kv.set(key, history.slice(-100)); // keep last 100

    return res.status(201).json(msg);
  }

  // =====================
  // DELETE LOGIC
  // =====================
  if (req.method === "DELETE") {

    // DELETE SINGLE MESSAGE
    if (index !== undefined) {
      const history = (await kv.get(key)) || [];

      if (history[index]) {
        history.splice(index, 1);
        await kv.set(key, history);
      }

      return res.status(200).json({ deleted: "message" });
    }

    // DELETE CONTACT FROM MASTER_LIST
    if (room === "MASTER_LIST" && deleteRoom) {
      const master = (await kv.get("room:MASTER_LIST")) || [];

      const updated = master.filter(m => !m.text.includes(deleteRoom));

      await kv.set("room:MASTER_LIST", updated);

      await kv.del(`room:${deleteRoom}`); // invalidate room completely

      return res.status(200).json({ deleted: "contact" });
    }

    // DELETE ENTIRE ROOM
    await kv.del(key);

    return res.status(200).json({ deleted: "room" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}s
