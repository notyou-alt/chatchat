const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.db");

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// ======================
// RANDOM HELPERS
// ======================
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

// ======================
// QUESTION PATTERNS
// ======================
const questionTemplates = [
  "apa itu {topic}",
  "jelaskan {topic}",
  "bagaimana {topic}",
  "kapan {topic}",
  "kenapa {topic}",
  "{topic} itu apa",
  "saya ingin tahu tentang {topic}",
  "info tentang {topic}"
];

// ======================
// INTENT BASE DATA
// ======================
const intentBank = {
  Event: [
    {
      name: "event_date",
      response: "Kegiatan mentoring dilaksanakan sesuai jadwal resmi kampus.",
      topics: ["jadwal mentoring", "tanggal mentoring", "waktu mentoring"]
    },
    {
      name: "event_detail",
      response: "Mentoring berisi materi, diskusi, dan evaluasi mahasiswa baru.",
      topics: ["isi mentoring", "kegiatan mentoring", "agenda mentoring"]
    },
    {
      name: "event_location",
      response: "Kegiatan mentoring dilakukan di kampus utama.",
      topics: ["lokasi mentoring", "tempat mentoring", "ruangan mentoring"]
    }
  ],

  Rule: [
    {
      name: "rule_attendance",
      response: "Peserta wajib hadir minimal 80% dari seluruh sesi.",
      topics: ["kehadiran", "absensi", "aturan hadir"]
    },
    {
      name: "rule_permission",
      response: "Izin hanya diperbolehkan dengan alasan yang jelas.",
      topics: ["izin tidak hadir", "aturan izin", "absen mentoring"]
    },
    {
      name: "rule_behavior",
      response: "Peserta wajib menjaga sikap selama kegiatan.",
      topics: ["etika mentoring", "aturan sikap", "perilaku peserta"]
    }
  ],

  Registration: [
    {
      name: "regist_how",
      response: "Pendaftaran dilakukan melalui website resmi kampus.",
      topics: ["cara daftar", "registrasi mentoring", "pendaftaran"]
    },
    {
      name: "regist_requirement",
      response: "Syarat pendaftaran adalah mahasiswa aktif.",
      topics: ["syarat daftar", "ketentuan registrasi", "persyaratan"]
    },
    {
      name: "regist_deadline",
      response: "Pendaftaran ditutup sebelum kegiatan dimulai.",
      topics: ["deadline daftar", "batas waktu", "penutupan registrasi"]
    }
  ],

  General: [
    {
      name: "general_what",
      response: "Mentoring adalah program pembinaan mahasiswa baru.",
      topics: ["apa itu mentoring", "definisi mentoring", "pengertian"]
    },
    {
      name: "general_benefit",
      response: "Mentoring membantu mahasiswa beradaptasi dengan lingkungan kampus.",
      topics: ["manfaat mentoring", "keuntungan", "fungsi mentoring"]
    },
    {
      name: "general_goal",
      response: "Tujuan mentoring adalah membimbing mahasiswa baru.",
      topics: ["tujuan mentoring", "goal", "sasaran"]
    }
  ],

  System: [
    {
      name: "system_error",
      response: "Jika terjadi error, hubungi admin sistem.",
      topics: ["error sistem", "bug", "masalah aplikasi"]
    },
    {
      name: "system_help",
      response: "Gunakan menu bantuan untuk informasi lebih lanjut.",
      topics: ["bantuan", "help", "cara pakai"]
    }
  ]
};

// ======================
// MAIN SEED
// ======================
async function seed() {
  console.log("🚀 Seeding besar dimulai...");

  // CLEAN
  await run("DELETE FROM categories");
  await run("DELETE FROM intents");
  await run("DELETE FROM questions");
  await run("DELETE FROM chat_logs");
  await run("DELETE FROM bad_words");

  // ======================
  // INSERT CATEGORIES
  // ======================
  const categories = Object.keys(intentBank);
  const categoryMap = {};

  for (let cat of categories) {
    const res = await run("INSERT INTO categories (name) VALUES (?)", [cat]);
    categoryMap[cat] = res.lastID;
  }

  // ======================
  // INTENTS (3–5 PER CATEGORY)
  // ======================
  for (let cat of categories) {
    const intents = intentBank[cat];

    for (let intent of intents) {
      const intentRes = await run(
        `INSERT INTO intents (category_id, name, response, emotion, created_at, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          categoryMap[cat],
          intent.name,
          intent.response,
          pick(["neutral", "happy", "serious", "cheerful", "shy"])
        ]
      );

      const intentId = intentRes.lastID;

      // ======================
      // QUESTIONS (3–5 PER INTENT)
      // ======================
      const questions = [];

      intent.topics.forEach(topic => {
        questionTemplates.forEach(tpl => {
          questions.push(tpl.replace("{topic}", topic));
        });
      });

      shuffle(questions);

      const selectedQuestions = questions.slice(0, 4 + Math.floor(Math.random() * 2)); // 4–5

      for (let q of selectedQuestions) {
        await run(
          `INSERT INTO questions (intent_id, question, created_at)
           VALUES (?, ?, datetime('now'))`,
          [intentId, q]
        );
      }
    }
  }

  // ======================
  // BAD WORDS
  // ======================
  const badWords = [
    "anjing", "bangsat", "kontol", "memek",
    "goblok", "tolol", "bego", "idiot"
  ];

  for (let w of badWords) {
    await run("INSERT INTO bad_words (word) VALUES (?)", [w]);
  }

  console.log("🔥 Seeder BESAR selesai!");
  db.close();
}

seed().catch(err => console.error(err));