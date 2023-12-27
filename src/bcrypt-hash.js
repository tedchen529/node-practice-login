import bcrypt from "bcryptjs";

const pw = "123456";
const hash = await bcrypt.hash(pw, 8);
// Q: Salt round of 8? Why await without async?
console.log(hash);
