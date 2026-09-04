import { Router } from "express";
import { db, nextId } from "../db.js";
import { hashPassword, verifyPassword, createSession, publicUser, requireAuth } from "../auth.js";

export const authRouter = Router();

authRouter.post("/signup", (req, res) => {
  const { name, email, password, role = "seeker", companyName } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: "Name, email and password are required." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  if (!["seeker", "employer"].includes(role)) return res.status(400).json({ error: "Invalid account type." });
  if (role === "employer" && !companyName) return res.status(400).json({ error: "Company name is required for an employer account." });

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: "An account with that email already exists." });

  let employerId = null;
  if (role === "employer") {
    employerId = nextId("e", "employers");
    db.prepare(
      `INSERT INTO employers (id, name, mark, a, b, plan, verified) VALUES (?, ?, 'hex', '#005CCC', '#FFFFFF', 'Free', 0)`
    ).run(employerId, companyName);
  }

  const { hash, salt } = hashPassword(password);
  const id = nextId("u", "users");
  db.prepare(
    `INSERT INTO users (id, role, name, email, password_hash, password_salt, employer_id, seed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, role, name, email.toLowerCase(), hash, salt, employerId, Math.floor(Math.random() * 12));

  const token = createSession(id);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  res.status(201).json({ token, user: publicUser(user) });
});

authRouter.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash, user.password_salt)) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }
  if (user.suspended) {
    return res.status(403).json({ error: "This account has been suspended. Contact support for help." });
  }
  const token = createSession(user.id);
  res.json({ token, user: publicUser(user) });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});
