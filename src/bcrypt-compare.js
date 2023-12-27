import bcrypt from "bcryptjs";

const hash = "$2a$08$.KhxmsId2fpngsJuUbDoGO87kvVUB5.e9UCL5VGQDi7TgISV2XKq2";
console.log(await bcrypt.compare("1234567", hash));
