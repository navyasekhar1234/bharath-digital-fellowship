require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ✅ MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "9959017685",
  database: process.env.DB_NAME || "mgnrega_db",
  waitForConnections: true,
  connectionLimit: 10,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
});

// ✅ Test DB connection
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ Connected to MySQL Database successfully!");
    conn.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
})();

// 🏛 Fetch all states
app.get("/states", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name FROM states ORDER BY name");
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching states:", err);
    res.status(500).json({ error: "Database error while fetching states" });
  }
});

// 🏙 Fetch districts for a specific state
app.get("/districts", async (req, res) => {
  const { state_id } = req.query;
  if (!state_id) return res.status(400).json({ error: "state_id is required" });

  try {
    const [rows] = await pool.query(
      "SELECT id, name FROM districts WHERE state_id = ? ORDER BY name",
      [state_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching districts:", err);
    res.status(500).json({ error: "Database error while fetching districts" });
  }
});

// 📊 Fetch MGNREGA stats for selected district
app.get("/stats", async (req, res) => {
  const districtId = Number(req.query.district_id);
  if (!districtId) return res.status(400).json({ error: "district_id required" });

  try {
    const [rows] = await pool.query(
      `SELECT 
          ms.year,
          ms.num_people_employed,
          ms.total_funds,
          ms.num_projects,
          ms.average_wage,
          ms.total_work_days,
          ms.households_covered,
          ms.employment_rate,
          ms.remarks,
          d.name AS district_name,
          s.name AS state_name
       FROM mgnrega_stats ms
       JOIN districts d ON ms.district_id = d.id
       JOIN states s ON d.state_id = s.id
       WHERE ms.district_id = ?
       ORDER BY ms.year ASC`,
      [districtId]
    );

    // ✅ Remove null or undefined fields from the response
    const cleanedRows = rows.map(row => {
      Object.keys(row).forEach(key => {
        if (row[key] === null || row[key] === undefined) row[key] = "";
      });
      return row;
    });

    res.json(cleanedRows);
  } catch (err) {
    console.error("❌ Error fetching MGNREGA stats:", err);
    res.status(500).json({ error: "Database error while fetching stats" });
  }
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
