import express from "express";
import db from "./../utils/connect-mysql.js";
import upload from "./../utils/upload-imgs.js";
import dayjs from "dayjs";

const router = express.Router();

const getListData = async (req) => {
  const perPage = 20; // 每頁幾筆
  let page = +req.query.page || 1;
  let totalRows = 0;
  let totalPages = 0;
  let rows = [];

  let output = {
    success: false,
    page,
    perPage,
    rows,
    totalRows,
    totalPages,

    redirect: "",
    info: "",
  };

  if (page < 1) {
    output.redirect = `?page=1`;
    output.info = `頁碼值小於 1`;
    return output;
  }

  const t_sql = "SELECT COUNT(1) totalRows FROM address_book";
  [[{ totalRows }]] = await db.query(t_sql);
  totalPages = Math.ceil(totalRows / perPage);
  if (totalRows > 0) {
    if (page > totalPages) {
      output.redirect = `?page=${totalPages}`;
      output.info = `頁碼值大於總頁數`;
      return { ...output, totalRows, totalPages };
    }

    const sql = `SELECT * FROM address_book ORDER BY sid DESC 
    LIMIT ${(page - 1) * perPage}, ${perPage}`;
    [rows] = await db.query(sql);
    output = { ...output, success: true, rows, totalRows, totalPages };
  }

  return output;
};

router.get("/", async (req, res) => {
  res.locals.pageName = "ab-list";
  res.locals.title = "列表 | " + res.locals.title;
  const output = await getListData(req);
  if (output.redirect) {
    return res.redirect(output.redirect);
  }

  res.render("address-book/list", output);
});

router.get("/api", async (req, res) => {
  res.json(await getListData(req));
});

router.get("/add", async (req, res) => {
  res.render("address-book/add");
});
router.post("/add", upload.none(), async (req, res) => {
  const output = {
    success: false,
    postData: req.body, // 除錯用
  };

  const { name, email, mobile, birthday, address } = req.body;
  const sql =
    "INSERT INTO `address_book`(`name`, `email`, `mobile`, `birthday`, `address`, `created_at`) VALUES (?, ?, ?, ?, ?, NOW() )";

  try {
    const [result] = await db.query(sql, [
      name,
      email,
      mobile,
      birthday,
      address,
    ]);
    output.result = result;
    output.success = !!result.affectedRows;
  } catch (ex) {
    output.exception = ex;
  }

  /*
  const sql = "INSERT INTO `address_book` SET ?";
  // INSERT INTO `address_book` SET `name`='abc',
  req.body.created_at = new Date();
  const [result] = await db.query(sql, [req.body]);
  */

  // {
  //   "fieldCount": 0,
  //   "affectedRows": 1,  # 影響的列數
  //   "insertId": 1021,   # 取得的 PK
  //   "info": "",
  //   "serverStatus": 2,
  //   "warningStatus": 0,
  //   "changedRows": 0    # 修改時真正有變動的資料筆數
  // }

  res.json(output);
});

router.get("/edit/:sid", async (req, res) => {
  const sid = +req.params.sid;
  res.locals.title = "編輯 | " + res.locals.title;

  const sql = `SELECT * FROM address_book WHERE sid=?`;
  const [rows] = await db.query(sql, [sid]);
  if (!rows.length) {
    return res.redirect(req.baseUrl);
  }
  const row = rows[0];
  row.birthday2 = dayjs(row.birthday).format("YYYY-MM-DD");

  res.render("address-book/edit", row);
});

router.put("/edit/:sid", async (req, res) => {
  const output = {
    success: false,
    postData: req.body,
    result: null,
  };
  // TODO: 表單資料檢查
  req.body.address = req.body.address.trim(); // 去除頭尾空白
  const sql = `UPDATE address_book SET ? WHERE sid=?`;
  const [result] = await db.query(sql, [req.body, req.body.sid]);
  output.result = result;
  output.success = !!result.changedRows;

  res.json(output);
});

router.delete("/:sid", async (req, res) => {
  const output = {
    success: false,
    result: null,
  };
  const sid = +req.params.sid;
  if (!sid || sid < 1) {
    return res.json(output);
  }

  const sql = ` DELETE FROM address_book WHERE sid=${sid}`;
  const [result] = await db.query(sql);
  output.result = result;
  output.success = !!result.affectedRows;
  res.json(output);
});
export default router;
