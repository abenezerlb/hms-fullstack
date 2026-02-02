import express from "express";
import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import cors from "cors";
import { queryDatabase } from "./lib.js";
import { generateSessionId } from "./lib.js";

const app = express();
const port = 3000;

app.use(
  cors({
    origin: "http://localhost:5500",
    credentials: true,
    methods: ["POST", "GET"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(cookieParser());

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // 1. Ensure password was actually provided in the request
  if (!password) {
    return res.status(400).send({ error: "Password is required" });
  }

  const rows = await queryDatabase("SELECT * FROM users WHERE username = ?", [
    username,
  ]);

  if (rows.length === 0) {
    return res.status(401).send({ error: "Invalid credentials" });
  }

  const user = rows[0];
  console.log("Fetched user:", user);

  if (!user.password_hash) {
    return res.status(500).send({
      error: "Database configuration error: password column not found",
    });
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) {
    return res.status(401).send({ error: "Invalid credentials" });
  }

  const sessionId = generateSessionId();

  await queryDatabase(
    "INSERT INTO sessions(id, user_id, expires_at) VALUES(?, ?, ?)",
    [sessionId, user.id, Date.now() + 24 * 60 * 60 * 1000],
  );
  res.cookie("session_id", sessionId, {
    httpOnly: true,
    sameSite: "Strict",
    maxAge: 24 * 60 * 60 * 1000,
  });

  // Success logic...
  res.send({
    message: "Login successful",
    user: { id: user.id, username: user.username },
  });
});

async function authMiddleware(req, res, next) {
  try {
    const sessionId = req.cookies?.session_id;
    console.log("Session ID from cookie:", sessionId);
    if (!sessionId) {
      return res.status(401).send({ error: "Authentication required" });
    }

    const rows = await queryDatabase(
      `SELECT s.id AS session_id, s.expires_at, s.user_id,
              u.id AS id, u.username, u.role_id, u.is_active
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > ?`,
      [sessionId, Date.now()],
    );

    if (rows.length === 0) {
      return res.status(401).send({ error: "Invalid or expired session" });
    }

    const row = rows[0];
    console.log("Authenticated user data:", row);

    if (!row.is_active) {
      return res.status(403).send({ error: "User is inactive" });
    }

    req.user = {
      id: row.id,
      username: row.username,
      role_id: row.role_id,
    };
    req.session = {
      id: row.session_id,
      expires_at: row.expires_at,
    };
    next();
  } catch (err) {
    next(err);
  }
}

app.use(authMiddleware);

app.get("/me", (req, res) => {
  res.send({ user: req.user });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
