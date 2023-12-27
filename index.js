// import "dotenv/config";
import express from "express";
import session from "express-session";
import dayjs from "dayjs";
import moment from "moment-timezone";
import cors from "cors";
import mysql_session from "express-mysql-session";
import bcrypt from "bcryptjs";
import sales from "./data/sales.json" assert { type: "json" };
// import multer from "multer";
// const upload = multer({ dest: "tmp_uploads/" });
import upload from "./utils/upload-imgs.js";
import db from "./utils/connect-mysql.js";

import admin2Router from "./routes/admin2.js";
import addressBookRouter from "./routes/address-book.js";
const app = express();

app.set("view engine", "ejs");

// top-level middlewares
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const MysqlStore = mysql_session(session);
const sessionStore = new MysqlStore({}, db);

app.use(
  session({
    saveUninitialized: false,
    resave: false,
    store: sessionStore,
    // NOTE: Configure express-session to use the store set up with express-mysql-session
    secret: "kdgdf9485498KIUGLKIU45490",
  })
);
// Q: "express-session" middleware create sessions? Session stores? Session storages?
// Q: Session store (server-side) vs session storage (client side)?
// Q: Cookies vs localStorage vs sessionStorage?
// Q: Revisit the configurations!

// 自訂頂層 middleware
app.use((req, res, next) => {
  res.locals.title = "小新的網站";
  res.locals.pageName = "";

  res.locals.toDateString = (d) => dayjs(d).format("YYYY-MM-DD");
  res.locals.toDateTimeString = (d) => dayjs(d).format("YYYY-MM-DD HH:mm:ss");

  res.locals.session = req.session;
  // Q: 讓 templates 可以取用 session?

  next();
});
// 定義路由
app.get("/", (req, res) => {
  res.locals.title = "首頁 | " + res.locals.title;

  res.render("home", { name: process.env.DB_NAME });
});

app.get("/json-sales", (req, res) => {
  res.locals.title = "JSON資料 | " + res.locals.title;
  res.locals.pageName = "json-sales";

  res.render("json-sales", { sales });
});

app.get("/try-qs", (req, res) => {
  res.json(req.query);
});

app.post("/try-post", (req, res) => {
  console.log("req.body:", req.body);
  res.json(req.body);
});

app.get("/try-post-form", (req, res) => {
  res.render("try-post-form");
});
app.post("/try-post-form", (req, res) => {
  res.render("try-post-form", req.body);
});

app.post("/try-upload", upload.single("avatar"), (req, res) => {
  res.json(req.file);
});

app.post("/try-uploads", upload.array("photos"), (req, res) => {
  res.json(req.files);
});

app.get("/my-params1/hello", (req, res) => {
  res.json({ hello: "shin" });
});

app.get("/my-params1/:action?/:id?", (req, res) => {
  res.json(req.params);
});

app.get(/^\/m\/09\d{2}-?\d{3}-?\d{3}$/i, (req, res) => {
  let u = req.url.slice(3).split("?")[0];
  u = u.split("-").join("");

  res.send({ u });
});

app.use("/admins", admin2Router);
app.use("/address-book", addressBookRouter);
app.get("/try-sess", (req, res) => {
  req.session.n = req.session.n || 0;
  req.session.n++;
  res.json(req.session);
});

app.get("/try-moment", (req, res) => {
  const fm = "YYYY-MM-DD HH:mm:ss";
  const m1 = moment();
  const m2 = moment("12-10-11");
  const m3 = moment("12-10-11", "DD-MM-YY");
  const d1 = dayjs();
  const d2 = dayjs("2023-11-15");
  const a1 = new Date();
  const a2 = new Date("2023-11-15");

  res.json({
    m1: m1.format(fm),
    m2: m2.format(fm),
    m3: m3.format(fm),
    m1a: m1.tz("Europe/Berlin").format(fm),
    d1: d1.format(fm),
    d2: d2.format(fm),
    a1,
    a2,
  });
});

app.get("/try-db", async (req, res) => {
  const [results, fields] = await db.query(
    `SELECT * FROM \`categories\` LIMIT 5`
  );
  res.json(results);
});

app.get("/yahoo", async (req, res) => {
  const r = await fetch("https://tw.yahoo.com/");
  const txt = await r.text();
  res.send(txt);
});

app.get("/login", async (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  // res.json(req.body);

  const output = {
    success: false,
    code: 0,
    postData: req.body,
  };

  if (!req.body.email || !req.body.password) {
    // 資料不足
    output.code = 410;
    return res.json(output);
  }

  const sql = "SELECT * FROM members WHERE email=?";
  // Q: How does it know that "?" is req.body.email?
  const [rows] = await db.query(sql, [req.body.email]);
  // NOTE: Can add more elements in the array

  if (!rows.length) {
    // 帳號是錯的
    output.code = 400;
    return res.json(output);
  }

  const row = rows[0];
  const pass = await bcrypt.compare(req.body.password, row.hash);
  // NOTE: Match with hashed password
  // console.log(req.body.password, row.hash);

  if (!pass) {
    // 密碼是錯的
    output.code = 420;
    return res.json(output);
  }

  output.code = 200;
  output.success = true;

  // 設定 session
  req.session.admin = {
    id: row.id,
    email: row.email,
    nickname: row.nickname,
  };

  output.member = req.session.admin;
  res.json(output);
});

app.get("/logout", async (req, res) => {
  delete req.session.admin;
  res.redirect("/");
});

// 設定靜態內容的資料夾
app.use(express.static("public"));
app.use("/bootstrap", express.static("node_modules/bootstrap/dist"));
app.use("/jquery", express.static("node_modules/jquery/dist"));

// *************** 404 page *** 所有的路由都要放在此之前
app.use((req, res) => {
  res.status(404).send(`<h1>你迷路了嗎</h1>`);
});

const port = process.env.WEB_PORT || 3001;

app.listen(port, () => {
  console.log(`express server: ${port}`);
});
