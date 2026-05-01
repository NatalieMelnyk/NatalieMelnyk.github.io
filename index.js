// File: index.js
// Part of Project: Assignment 4
// Author: Natalie Melnyk
// Purpose:
//  Routing stuff goes here
//  Module.exports for loading pages
//  processes.cwd
// Dependencies
const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const {MongoClient, ObjectId} = require('mongodb');
require("dotenv").config();

// Web link for Vercel: https://task-buddy-indol.vercel.app/

// Get connection string from env
const uri = process.env.MONGO_URI;
console.log("URI found:", !!uri); // logs true/false without exposing the value

// Establish client on URI
const client = new MongoClient(uri);

// ──────────────────────────────────────────────
// In-memory session store
// Key: sessionId (random string)
// Value: { username, createdAt }
// ──────────────────────────────────────────────
const sessions = {};
const SESSION_MAX_AGE = 60 * 60 * 1000; // 1 hour in ms

// METHOD NAME: createSession
//  
// WRITTEN BY: Bebik, Natalie Melnyk
//
// DATE CREATED: 4.30.2026
//  
// METHOD PURPOSE:
//   This routine is called whenever the user clicks the form's command button.
//   This routine will invoke all work performed by the program.  There is an 
//   assumption that the user has entered all necessary information into the 
//   form prior to invoking this routine.  No data validation is performed.  
//   Therefore if incorrect data types or blank textboxes are encountered, 
//   the program will not deal with those issues.
 //  	 
 // PARAMETERS LIST (in Parameter Order):
 //  
 //
 // RETURNS:
 //   sessionId
 //  	
 //  LOCAL VARIABLE DICTIONARY (in Alphabetical Order):
 //    sessionId -
 //  
 // MODIFICATION HISTORY:
 // -------------------------------------------------------------
function createSession(username) {
    const sessionId = crypto.randomBytes(32).toString("hex");
    sessions[sessionId] = {
        username,
        createdAt: Date.now(),
    };
    console.log(`[SESSION] Created session for "${username}" -> ${sessionId.slice(0, 12)}...`);
    console.log(`[SESSION] Active sessions: ${Object.keys(sessions).length}`);
    return sessionId;
}

function getSession(sessionId) {
    if (!sessionId) return null;
    const session = sessions[sessionId];
    if (!session) {
        console.log(`[SESSION] Session not found: ${sessionId.slice(0, 12)}...`);
        return null;
    }
    // Check if expired
    if (Date.now() - session.createdAt > SESSION_MAX_AGE) {
        console.log(`[SESSION] Session expired for "${session.username}"`);
        delete sessions[sessionId];
        return null;
    }
    return session;
}

function destroySession(sessionId) {
    if (sessions[sessionId]) {
        console.log(`[SESSION] Destroyed session for "${sessions[sessionId].username}"`);
        delete sessions[sessionId];
    }
}

// ──────────────────────────────────────────────
// Cookie helpers
// ──────────────────────────────────────────────
function parseCookies(req) {
    const cookieHeader = req.headers.cookie || "";
    const cookies = {};
    cookieHeader.split(";").forEach((cookie) => {
        const [name, ...rest] = cookie.trim().split("=");
        if (name) {
            cookies[name.trim()] = rest.join("=").trim();
        }
    });
    return cookies;
}

function setSessionCookie(res, sessionId) {
    // HttpOnly so JS can't touch it, Path=/ so it's sent on every request
    const cookie = `sid=${sessionId}; HttpOnly; Path=/; Max-Age=${SESSION_MAX_AGE / 1000}`;
    console.log(`[COOKIE] Setting cookie: sid=${sessionId.slice(0, 12)}...`);
    res.setHeader("Set-Cookie", cookie);
}

function clearSessionCookie(res) {
    console.log("[COOKIE] Clearing session cookie");
    res.setHeader("Set-Cookie", "sid=; HttpOnly; Path=/; Max-Age=0");
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => resolve(body));
        req.on("error", reject);
    });
}

function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
}

function serveFile(res, filePath, contentType) {
    console.log(`[FILE] Serving: ${filePath}`);
    fs.readFile(filePath, (err, content) => {
        if (err) {
            console.log(`[FILE] ERROR reading ${filePath}:`, err.message);
            res.writeHead(500);
            res.end("Error loading page");
            return;
        }
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
    });
}

    function getContentType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const types = {
            '.jpg':  'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png':  'image/png',
            '.gif':  'image/gif',
            '.svg':  'image/svg+xml',
            '.webp': 'image/webp',
        };
        return types[ext] || 'application/octet-stream';
    }

// ──────────────────────────────────────────────
// MongoDB
// ──────────────────────────────────────────────

let buddyDataCollection;
let usersCollection;

async function connectDB() {
    try {
        await client.connect();
        const db = client.db("TaskBuddy");
        buddyDataCollection = db.collection("buddyData");
        usersCollection = db.collection("users");
        console.log("[DB] Connected to MongoDB");
    } catch (e) {
        console.error("[DB] MongoDB connection failed:", e);
        process.exit(1);
    }
}

// ──────────────────────────────────────────────
// Server
// ──────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    console.log(`\n[REQ] ${req.method} ${pathname}`);
    
    // Parse cookies on every request
    const cookies = parseCookies(req);
    const sessionId = cookies.sid;
    const session = getSession(sessionId);

    if (session) {
        console.log(`[AUTH] Valid session for "${session.username}"`);
    } else {
        console.log("[AUTH] No valid session");
    }

    // --- PUBLIC: Serve CSS ----------------------
    if (pathname === "/style.css") {
        serveFile(res, path.join(__dirname, "public", "style.css"), "text/css");
        return;
    }
    // --- PUBLIC: Serve images -------------------
    if (pathname.startsWith("/images/")) {
        const imagePath = path.join(__dirname, "public", pathname);
        serveFile(res, imagePath, getContentType(pathname));
        return;
    }
    // --- PUBLIC: Marketing site ------------------
    if (pathname === "/" && req.method === "GET") {
        serveFile(res, path.join(__dirname, "public", "index.html"), "text/html");
        return;
    }
    // --- PUBLIC: API for marketing site -----------
    if (pathname === "/api/public" && req.method === "GET") {
        buddyDataCollection
            .find({})
            .toArray()
            .then((results) => {
                const plans    = results.filter(p => p.type === "plan");
                const features = results.filter(p => p.type === "feature");
                sendJSON(res, 200, { plans, features });
            })
            .catch((err) => {
                sendJSON(res, 500, { error: "Failed to fetch data" });
            });
        return;
    }

    // --- PUBLIC: Login page -----------------------------
    if (pathname === "/login" && req.method === "GET") {
        console.log("[ROUTE] Serving login page");
        // If already logged in, redirect to /books
        if (session) {
            console.log("[ROUTE] Already logged in, redirecting to /admin");
            res.writeHead(302, { Location: "/admin" });
            res.end();
            return;
        }
        serveFile(res, path.join(__dirname, "public", "login.html"), "text/html");
        return;
    }

    // --- PUBLIC: Login API --------------------------
    if (pathname === "/login" && req.method === "POST") {
        console.log("[ROUTE] Login attempt...");
        const body = await readBody(req);
        let parsed;
        try {
            parsed = JSON.parse(body);
        } catch {
            console.log("[LOGIN] Bad JSON in request body");
            sendJSON(res, 400, { error: "Invalid JSON" });
            return;
        }

        const { username, password } = parsed;
        console.log(`[LOGIN] Trying username="${username}"`);

        const user = await usersCollection.findOne({username, password});

        if (!user) {
            console.log(`[LOGIN] FAILED for username="${username}"`);
            sendJSON(res, 401, { error: "Invalid username or password" });
            return;
        }

        console.log(`[LOGIN] SUCCESS for username="${username}"`);
        const newSessionId = createSession(user.username);
        setSessionCookie(res, newSessionId);
        sendJSON(res, 200, { success: true, username: user.username });
        return;
    }

    // --- PUBLIC: Logout -------------------------------
    if (pathname === "/logout") {
        console.log("[ROUTE] Logout");
        if (sessionId) destroySession(sessionId);
        clearSessionCookie(res);
        res.writeHead(302, { Location: "/login" });
        res.end();
        return;
    }
    // ==================================================
    // --- AUTH WALL: everything below requires login ---
    // ==================================================
    if (!session) {
        if (pathname.startsWith("/api")) {
            console.log("[AUTH] Blocked API request - no session");
            sendJSON(res, 401, { error: "Unauthorized. Please log in." });
            return;
        }
        console.log("[AUTH] Blocked page request - redirecting to /login");
        res.writeHead(302, { Location: "/login" });
        res.end();
        return;
    }

    // ─── PROTECTED: Book collection page ──────

    if (pathname === "/admin" && req.method === "GET") {
        console.log("[ROUTE] Serving products page (admin.html)");
        serveFile(res, path.join(__dirname, "public", "admin.html"), "text/html");
        return;
    }

    // ─── PROTECTED: About page ────────────────

    if (pathname === "/about" && req.method === "GET") {
        console.log("[ROUTE] Serving about page");
        serveFile(res, path.join(__dirname, "public", "about.html"), "text/html");
        return;
    }

    // ─── PROTECTED: API routes ────────────────

    // GET all product data
    if (pathname === "/api" && req.method === "GET") {
        console.log("[API] GET all buddy data");
        buddyDataCollection
            .find({})
            .toArray()
            .then((results) => {
                console.log(`[API] Found ${results.length} buddy data`);
                sendJSON(res, 200, results);
            })
            .catch((err) => {
                console.log("[API] ERROR fetching buddy data:", err.message);
                sendJSON(res, 500, { error: "Failed to fetch buddy data" });
            });
        return;
    }

    // POST new book
    if (pathname === "/api" && req.method === "POST") {
        console.log("[API] POST new product");
        const body = await readBody(req);
        let product;
        try {
            product = JSON.parse(body);
        } catch {
            console.log("[API] Bad JSON in POST body");
            sendJSON(res, 400, { error: "Invalid JSON" });
            return;
        }
        product.addedBy = session.username;
        console.log(`[API] Adding product: "${product.name}" (user: ${session.username})`);
        buddyDataCollection
            .insertOne(product)
            .then((result) => {
                console.log("[API] Product inserted:", result.insertedId);
                sendJSON(res, 201, result);
            })
            .catch((err) => {
                console.log("[API] ERROR inserting product:", err.message);
                sendJSON(res, 500, { error: "Failed to add product" });
            });
        return;
    }

    // PUT update product
    if (pathname.startsWith("/api/") && req.method === "PUT") {
        const id = Number(pathname.split("/")[2]);
        console.log(`[API] PUT update product id=${id}`);
        const body = await readBody(req);

        // Check objectId is valid
        let objectId;
        try {
            objectId = new ObjectId(id);
        } catch {
            sendJSON(res, 400, { error: "Invalid product ID" });
            return;
        }

        let updates;
        try {
            updates = JSON.parse(body);
        } catch {
            console.log("[API] Bad JSON in PUT body");
            sendJSON(res, 400, { error: "Invalid JSON" });
            return;
        }
        // Don't Allow _id to be overwritten
        delete updates._id;

        console.log("[API] Updates:", updates);
        buddyDataCollection
            .updateOne({_id: objectId}, { $set: updates })
            .then((result) => {
                console.log(`[API] Updated: matchedCount=${result.matchedCount}, modifiedCount=${result.modifiedCount}`);
                sendJSON(res, 200, result);
            })
            .catch((err) => {
                console.log("[API] ERROR updating product:", err.message);
                sendJSON(res, 500, { error: "Failed to update product" });
            });
        return;
    }

    // DELETE product
    if (pathname.startsWith("/api/") && req.method === "DELETE") {
        const id = Number(pathname.split("/")[2]);
        console.log(`[API] DELETE product id=${id}`);

        // Verify object exists
        let objectId;
        try {
            objectId = new ObjectId(id);
        } catch {
            sendJSON(res, 400, { error: "Invalid product ID" });
            return;
        }
        buddyDataCollection
            .deleteOne({_id: objectId })
            .then((result) => {
                console.log(`[API] Deleted: deletedCount=${result.deletedCount}`);
                sendJSON(res, 200, result);
            })
            .catch((err) => {
                console.log("[API] ERROR deleting product:", err.message);
                sendJSON(res, 500, { error: "Failed to delete product" });
            });
        return;
    }

    // 404
    console.log(`[ROUTE] 404 - nothing matched for ${pathname}`);
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end("<h1>404 nothing is here</h1>");
});

const PORT = process.env.PORT || 5959;

connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`\n[SERVER] Running on port ${PORT}`);
        console.log("[SERVER] Routes:");
        console.log("  GET  /login  - login page (public)");
        console.log("  POST /login  - login API (public)");
        console.log("  GET  /logout - destroy session & redirect");
        console.log("  GET  /books  - buddy data collection page (protected)");
        console.log("  GET  /about  - about page (protected)");
        console.log("  GET  /api    - fetch all products (protected)");
        console.log("  POST /api    - add product (protected)");
        console.log("  PUT  /api/:id   - update product (protected)");
        console.log("  DELETE /api/:id - delete product (protected)");
        console.log("\n[SERVER] Waiting for requests...\n");
    });
});