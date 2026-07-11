import { execSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function globalSetup() {
  const backendDir = path.resolve(__dirname, "..", "..", "backend")

  execSync("python tests/setup_db.py", {
    cwd: backendDir,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL:
        "postgresql+asyncpg://helpdesk:helpdesk@localhost:5432/helpdesk_test",
      PYTHONIOENCODING: "utf-8",
    },
  })
}

export default globalSetup
