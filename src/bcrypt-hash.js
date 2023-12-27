import bcrypt from "bcryptjs";

const pw = "testingtesting";
const hash = await bcrypt.hash(pw, 8);
// Q: Salt round of 8? Why await without async?
console.log(hash);
