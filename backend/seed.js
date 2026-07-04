// backend/seed.js
require("dotenv").config();
const pool = require("./db");

const run = (sql, params = []) => pool.query(sql, params);

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

const TEMPLATES = [
  "apa itu {topic}",
  "jelaskan {topic}",
  "bagaimana {topic}",
  "kapan {topic}",
  "kenapa {topic}",
  "{topic} itu apa",
  "saya ingin tahu tentang {topic}",
  "info tentang {topic}",
];

const EMOTIONS = ["neutral", "happy", "serious", "cheerful", "shy"];

const INTENT_BANK = {
  Event: [
    {
      name: "event_date",
      response: "Kegiatan mentoring dilaksanakan sesuai jadwal resmi kampus.",
      topics: ["jadwal mentoring", "tanggal mentoring", "waktu mentoring"],
    },
    {
      name: "event_detail",
      response: "Mentoring berisi materi, diskusi, dan evaluasi mahasiswa baru.",
      topics: ["isi mentoring", "kegiatan mentoring", "agenda mentoring"],
    },
    {
      name: "event_location",
      response: "Kegiatan mentoring dilakukan di kampus utama.",
      topics: ["lokasi mentoring", "tempat mentoring", "ruangan mentoring"],
    },
  ],
  Rule: [
    {
      name: "rule_attendance",
      response: "Peserta wajib hadir minimal 80% dari seluruh sesi.",
      topics: ["kehadiran", "absensi", "aturan hadir"],
    },
    {
      name: "rule_permission",
      response: "Izin hanya diperbolehkan dengan alasan yang jelas.",
      topics: ["izin tidak hadir", "aturan izin", "absen mentoring"],
    },
    {
      name: "rule_behavior",
      response: "Peserta wajib menjaga sikap selama kegiatan.",
      topics: ["etika mentoring", "aturan sikap", "perilaku peserta"],
    },
  ],
  Registration: [
    {
      name: "regist_how",
      response: "Pendaftaran dilakukan melalui website resmi kampus.",
      topics: ["cara daftar", "registrasi mentoring", "pendaftaran"],
    },
    {
      name: "regist_requirement",
      response: "Syarat pendaftaran adalah mahasiswa aktif.",
      topics: ["syarat daftar", "ketentuan registrasi", "persyaratan"],
    },
    {
      name: "regist_deadline",
      response: "Pendaftaran ditutup sebelum kegiatan dimulai.",
      topics: ["deadline daftar", "batas waktu", "penutupan registrasi"],
    },
  ],
  General: [
    {
      name: "general_what",
      response: "Mentoring adalah program pembinaan mahasiswa baru.",
      topics: ["apa itu mentoring", "definisi mentoring", "pengertian"],
    },
    {
      name: "general_benefit",
      response: "Mentoring membantu mahasiswa beradaptasi dengan lingkungan kampus.",
      topics: ["manfaat mentoring", "keuntungan", "fungsi mentoring"],
    },
    {
      name: "general_goal",
      response: "Tujuan mentoring adalah membimbing mahasiswa baru.",
      topics: ["tujuan mentoring", "goal", "sasaran"],
    },
  ],
  System: [
    {
      name: "system_error",
      response: "Jika terjadi error, hubungi admin sistem.",
      topics: ["error sistem", "bug", "masalah aplikasi"],
    },
    {
      name: "system_help",
      response: "Gunakan menu bantuan untuk informasi lebih lanjut.",
      topics: ["bantuan", "help", "cara pakai"],
    },
  ],
};

const BAD_WORDS = ["anjing", "bangsat", "kontol", "memek", "goblok", "tolol", "bego", "idiot"];

const generateQuestions = (topics, count = 5) => {
  const all = topics.flatMap((topic) =>
    TEMPLATES.map((tpl) => tpl.replace("{topic}", topic))
  );
  return shuffle(all).slice(0, count);
};

async function seed() {
  console.log("Seeder dimulai...");

  await run("DELETE FROM questions");
  await run("DELETE FROM chat_logs");
  await run("DELETE FROM bad_words");
  await run("DELETE FROM intents");
  await run("DELETE FROM categories");

  for (const [categoryName, intents] of Object.entries(INTENT_BANK)) {
    const catResult = await run(
      "INSERT INTO categories (name) VALUES ($1) RETURNING id",
      [categoryName]
    );
    const categoryId = catResult.rows[0].id;

    for (const intent of intents) {
      const intentResult = await run(
        `INSERT INTO intents (category_id, name, response, emotion, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
        [categoryId, intent.name, intent.response, pick(EMOTIONS)]
      );
      const intentId = intentResult.rows[0].id;

      const questions = generateQuestions(intent.topics);
      for (const q of questions) {
        await run(
          `INSERT INTO questions (intent_id, question, created_at) VALUES ($1, $2, NOW())`,
          [intentId, q]
        );
      }
    }
  }

  for (const word of BAD_WORDS) {
    await run("INSERT INTO bad_words (word) VALUES ($1) ON CONFLICT DO NOTHING", [word]);
  }

  console.log("Seeder selesai!");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seeder gagal:", err);
  pool.end();
  process.exit(1);
});