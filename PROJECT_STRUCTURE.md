PROJECT STRUCTURE
==================

frontend/
|-- [DIR] public/
|   |-- [IMG] chat_p.png
|   |-- [FILE] favicon.ico
|   |-- [HTML] index.html
|   |-- [IMG] logo192.png
|   |-- [IMG] logo512.png
|   |-- [JSON] manifest.json
|   +-- [FILE] robots.txt
|-- [DIR] src/
|   |-- [DIR] assets/
|   |   |-- [IMG] angry.svg
|   |   |-- [IMG] cheerful.svg
|   |   |-- [IMG] happy.svg
|   |   |-- [IMG] neutral.svg
|   |   |-- [IMG] serious.svg
|   |   +-- [IMG] shy.svg
|   |-- [CSS] admin.css
|   |-- [JS]  admin.js
|   |-- [CSS] app.css
|   |-- [JS]  App.js
|   |-- [CSS] global.css
|   |-- [JS]  index.js
|   |-- [IMG] logo.svg
|   |-- [JS]  reportWebVitals.js
|   +-- [JS]  setupTests.js
|-- [JSON] package.json
|-- [JSON] package-lock.json
+-- [MD]  README.md

backend/
|-- [DIR] routes/
|   |-- [DIR] admin/
|   |   |-- [JS]  categories.js
|   |   |-- [JS]  intents.js
|   |   |-- [JS]  logs.js
|   |   |-- [JS]  questions.js
|   |   +-- [JS]  transfer.js
|   +-- [JS]  chat.js
|-- [DIR] utils/
|   |-- [JS]  asyncDb.js
|   |-- [JS]  gemini.js
|   +-- [JS]  nlp.js
|-- [FILE] database.db
|-- [JS]  db.js
|-- [JS]  index.js
|-- [JS]  migrate.js
|-- [JSON] package.json
|-- [JSON] package-lock.json
+-- [JS]  seed.js

Root files:
[FILE] .gitignore
[FILE] generate-tree.ps1
[JSON] package-lock.json
[FILE] project-structure.txt
