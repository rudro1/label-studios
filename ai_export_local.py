import os
import re
import subprocess
from pathlib import Path

ROOT = Path(".").resolve()
OUT = ROOT / "_ai_export"
OUT.mkdir(exist_ok=True)

def run_cmd(cmd):
    try:
        return subprocess.check_output(
            cmd,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace"
        )
    except Exception as e:
        return f"COMMAND FAILED: {' '.join(cmd)}\n{e}\n"

IGNORE_DIRS = {
    ".git",
    "_ai_export",
    "node_modules",
    "venv",
    ".venv",
    "env",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".cache",
    "dist",
    "build",
    ".next",
    ".nuxt",
    "coverage",
    "staticfiles",
    "media",
    "uploads",
    "upload",
    "logs",
    "tmp",
    "temp",
    ".idea",
    ".vscode",
    ".tox",
    "htmlcov",
    "label_studio.egg-info",
}

IGNORE_EXTS = {
    ".zip", ".rar", ".7z", ".tar", ".gz",
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp",
    ".mp4", ".mov", ".avi", ".mkv", ".mp3", ".wav",
    ".pdf", ".docx", ".xlsx", ".pptx",
    ".sqlite", ".db", ".dump", ".bak",
    ".exe", ".dll", ".so", ".dylib", ".bin",
    ".pyc", ".pyo",
    ".lock",
    ".map",
}

SECRET_FILE_NAMES = {
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
    "secrets.json",
}

MAX_FILE_SIZE = 900_000
MAX_CHUNK_SIZE = 900_000

SECRET_PATTERNS = [
    re.compile(r"(?i)(api[_-]?key\s*[:=]\s*)(['\"]?)[^'\"\n]+"),
    re.compile(r"(?i)(secret\s*[:=]\s*)(['\"]?)[^'\"\n]+"),
    re.compile(r"(?i)(password\s*[:=]\s*)(['\"]?)[^'\"\n]+"),
    re.compile(r"(?i)(token\s*[:=]\s*)(['\"]?)[^'\"\n]+"),
    re.compile(r"(?i)(private[_-]?key\s*[:=]\s*)(['\"]?)[^'\"\n]+"),
]

def mask_secrets(text):
    for pat in SECRET_PATTERNS:
        text = pat.sub(r"\1\2***MASKED***", text)
    return text

def is_ignored(path: Path):
    rel = path.relative_to(ROOT)
    parts = set(rel.parts)

    if parts & IGNORE_DIRS:
        return True

    if path.name in SECRET_FILE_NAMES:
        return True

    if path.is_file() and path.suffix.lower() in IGNORE_EXTS:
        return True

    return False

overview = []
overview.append(f"ROOT: {ROOT}")
overview.append("\n===== PWD =====")
overview.append(run_cmd(["pwd"]))
overview.append("\n===== TOP LEVEL LS =====")
overview.append(run_cmd(["ls", "-la"]))
overview.append("\n===== PYTHON VERSION =====")
overview.append(run_cmd(["python3", "--version"]))
overview.append("\n===== GIT CHECK =====")
overview.append(run_cmd(["git", "status", "--short"]))
overview.append("\n===== GIT REMOTE =====")
overview.append(run_cmd(["git", "remote", "-v"]))
overview.append("\n===== GIT BRANCH =====")
overview.append(run_cmd(["git", "branch", "--show-current"]))
overview.append("\n===== RECENT COMMITS =====")
overview.append(run_cmd(["git", "log", "--oneline", "-20"]))

(OUT / "00_overview.txt").write_text("\n".join(overview), encoding="utf-8")

# Save diff if git exists
diff_patch = run_cmd(["git", "diff", "--no-ext-diff"])
(OUT / "05_git_diff.patch").write_text(diff_patch, encoding="utf-8")

tree_lines = []
skipped = []
included_blocks = []

for path in ROOT.rglob("*"):
    try:
        rel = path.relative_to(ROOT)
    except Exception:
        continue

    if is_ignored(path):
        continue

    if path.is_dir():
        tree_lines.append(f"[DIR]  {rel}")
        continue

    try:
        size = path.stat().st_size
    except Exception:
        skipped.append(f"{rel} -- cannot stat")
        continue

    tree_lines.append(f"[FILE] {rel} ({size} bytes)")

    if size > MAX_FILE_SIZE:
        skipped.append(f"{rel} -- too large: {size} bytes")
        continue

    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        skipped.append(f"{rel} -- unreadable/binary")
        continue

    text = mask_secrets(text)

    included_blocks.append(
        f"\n\n===== FILE: {rel} =====\n{text}\n===== END FILE: {rel} =====\n"
    )

(OUT / "01_project_tree.txt").write_text("\n".join(tree_lines), encoding="utf-8")
(OUT / "02_skipped_files.txt").write_text("\n".join(skipped), encoding="utf-8")

chunk = ""
n = 1

for block in included_blocks:
    if len(chunk) + len(block) > MAX_CHUNK_SIZE:
        (OUT / f"code_part_{n:03}.txt").write_text(chunk, encoding="utf-8")
        n += 1
        chunk = ""
    chunk += block

if chunk:
    (OUT / f"code_part_{n:03}.txt").write_text(chunk, encoding="utf-8")

readme = f"""
AI EXPORT DONE.

You do NOT need GitHub.

Send these first:
1. 00_overview.txt
2. 01_project_tree.txt
3. 02_skipped_files.txt

If 05_git_diff.patch is not empty, send it too.

Then send code_part files when asked:
code_part_001.txt, code_part_002.txt, etc.

Root exported:
{ROOT}
"""

(OUT / "README_SEND_THESE_FILES.txt").write_text(readme, encoding="utf-8")

print("DONE.")
print(f"Export folder created: {OUT}")
print("Open it with:")
print("open _ai_export")
print("First send:")
print("00_overview.txt")
print("01_project_tree.txt")
print("02_skipped_files.txt")
