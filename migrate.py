#!/usr/bin/env python3
"""Export and restore this user's Pi setup without credentials or machine caches."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import sys
import tarfile
import tempfile
from datetime import datetime, timezone

TOKEN = "@@PI_MIGRATION_HOME@@"
REDACTED = "__PI_MIGRATION_SECRET_REQUIRED__"
OMIT = {
    ".git", "node_modules", "__pycache__", ".DS_Store", ".cache",
    ".agent-essential-state", ".venv", "coverage", "dist", "build",
    "auth.json", "mcp-auth.json", "models-store.json", "trust.json", ".npmrc",
}
SENSITIVE = re.compile(
    r"(?:api[_-]?key|api[_-]?token|access[_-]?token|refresh[_-]?token|"
    r"client[_-]?secret|password|authorization|cookie|bearer[_-]?token|private[_-]?key|secret|token)$",
    re.I,
)
TEXT = {".json", ".md", ".mdx", ".ts", ".tsx", ".js", ".mjs", ".cjs",
        ".sh", ".toml", ".yaml", ".yml", ".txt", ".py", ".html", ".css"}
ROOTS = [".pi/agent", ".pi/subagents", ".agents/skills"]
SECRET_PATTERN = re.compile(
    r"\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|"
    r"github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16})\b"
)


def is_reference(value):
    return bool(re.fullmatch(
        r"(?:\$\{[A-Z][A-Z0-9_]*\}|\$[A-Z][A-Z0-9_]*|"
        r"[A-Z][A-Z0-9_]*_(?:KEY|TOKEN|SECRET|PASSWORD))", value
    ))


def contains_secret(text, secret):
    if len(secret) >= 12:
        return secret in text
    return bool(re.search(r"(?<!\w)" + re.escape(secret) + r"(?!\w)", text))


def scrub(text, secrets, notes, location):
    for secret in secrets:
        if contains_secret(text, secret):
            if len(secret) < 12:
                # Replacing short words globally could silently corrupt executable code.
                raise ValueError("Short credential appears in export; review file: " + location)
            text = text.replace(secret, REDACTED)
            notes.append(location + ": known credential removed")
    text, count = SECRET_PATTERN.subn(REDACTED, text)
    if count:
        notes.append(location + ": credential-shaped values removed (" + str(count) + ")")
    return text


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def save(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    path.chmod(0o600)


def run(args, cwd=None, capture=False):
    return subprocess.run(args, cwd=cwd, check=True, text=True,
                          stdout=subprocess.PIPE if capture else None,
                          stderr=subprocess.PIPE if capture else None)


def secret_values(home):
    """Collect known credential values in memory; never log or persist them."""
    found = set()

    def walk(value, sensitive=False):
        if isinstance(value, dict):
            for key, val in value.items():
                walk(val, sensitive or bool(SENSITIVE.search(key)) or key in {"access", "refresh", "key"})
        elif isinstance(value, list):
            for val in value:
                walk(val, sensitive)
        elif sensitive and isinstance(value, str) and value and not is_reference(value):
            found.add(value)

    for name in ["auth.json", "mcp-auth.json"]:
        path = home / ".pi/agent" / name
        if path.exists():
            walk(load(path))
    for key, val in os.environ.items():
        if SENSITIVE.search(key) and val and not is_reference(val):
            found.add(val)
    return sorted(found, key=len, reverse=True)


def sanitize_json(value, notes, location=""):
    if isinstance(value, dict):
        result = {}
        for key, val in value.items():
            loc = location + "/" + key
            if SENSITIVE.search(key) and isinstance(val, str) and val:
                # Environment references are configuration, not their resolved values.
                if not is_reference(val):
                    notes.append(loc)
                    val = REDACTED
            result[key] = sanitize_json(val, notes, loc)
        return result
    if isinstance(value, list):
        return [sanitize_json(val, notes, location + "/" + str(i)) for i, val in enumerate(value)]
    return value


def omitted(name):
    return (name in OMIT or name.startswith(".env") or name.endswith((".pem", ".key", ".log", ".jsonl"))
            or name in {"id_rsa", "id_ed25519", "id_ecdsa"})


# Ambient/VC machinery that exists only on a particular machine or after git
# operations (never committed). It must not affect inventory comparisons.
IGNORED_AMBIENT = {".git", "__pycache__", ".DS_Store"}


def is_ignored_rel(rel):
    return any(part in IGNORED_AMBIENT for part in rel.parts) or rel.suffix == ".pyc"


def copy_resource(source, dest, replacements, secrets, notes):
    """Dereference internal links only, and never follow cycles or outside links."""
    source, dest = Path(source), Path(dest)
    boundary = source.resolve() if source.is_dir() else source.resolve().parent

    def visit(src, dst, chain):
        if omitted(src.name):
            return
        real = src.resolve(strict=True)
        if real != boundary and boundary not in real.parents:
            raise ValueError("External symlink needs explicit review: " + str(src))
        if src.is_dir():
            if real in chain:
                raise ValueError("Symlink cycle: " + str(src))
            dst.mkdir(parents=True, exist_ok=True)
            dst.chmod(0o700)
            for child in sorted(src.iterdir()):
                visit(child, dst / child.name, chain | {real})
            return
        if not src.is_file():
            raise ValueError("Unsupported resource: " + str(src))
        data = src.read_bytes()
        if b"-----BEGIN " in data and b"PRIVATE KEY-----" in data:
            raise ValueError("Private key material found in: " + str(src))
        is_text = src.suffix in TEXT or src.name.startswith(".git") or src.name in {"LICENSE", "Dockerfile"}
        if is_text:
            text = data.decode("utf-8")
            if src.suffix == ".json" and src.name not in {"package.json", "package-lock.json"}:
                try:
                    obj = sanitize_json(json.loads(text), notes, str(dst))
                    text = json.dumps(obj, ensure_ascii=False, indent=2) + "\n"
                except json.JSONDecodeError:
                    pass  # Some tsconfig files use JSONC; still scan their text below.
            text = scrub(text, secrets, notes, str(dst))
            for old, new in replacements:
                text = text.replace(old, new)
            data = text.encode("utf-8")
        elif any(secret.encode() in data for secret in secrets):
            raise ValueError("Known credential in binary file: " + str(src))
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_bytes(data)
        dst.chmod(0o700 if src.stat().st_mode & 0o111 else 0o600)

    visit(source, dest, set())


def compatibility_patches(agent):
    """Avoid Pi 1.3's jiti subpath-alias failure in these two known imports.

    AST inspection confirmed that calculateCost is the only imported binding;
    the host's root compat entrypoint exports exactly the same function.
    """
    before = 'import { calculateCost } from "@earendil-works/pi-ai/models";'
    after = 'import { calculateCost } from "@earendil-works/pi-ai";'
    changed = []
    for relative in ["extensions/inception/index.ts", "extensions/subagents/runner.ts"]:
        path = agent / relative
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        if before in text:
            if text.count(before) != 1:
                raise ValueError("Unexpected compatibility import shape: " + relative)
            path.write_text(text.replace(before, after), encoding="utf-8")
            changed.append(relative)
    return changed


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_checksums(bundle):
    files = sorted(
        p for p in bundle.rglob("*")
        if p.is_file() and p != bundle / "checksums.json"
        and not is_ignored_rel(p.relative_to(bundle))
    )
    save(bundle / "checksums.json", {p.relative_to(bundle).as_posix(): digest(p) for p in files})


def verify(bundle):
    bundle = Path(bundle).resolve()
    rel_of = lambda path: path.relative_to(bundle)
    for path in bundle.rglob("*"):
        if path.is_symlink() and not is_ignored_rel(rel_of(path)):
            raise ValueError("Bundle must not contain symlinks: " + str(rel_of(path)))
    expected = load(bundle / "checksums.json")
    actual = {
        rel_of(p).as_posix()
        for p in bundle.rglob("*")
        if p.is_file() and p != bundle / "checksums.json"
        and not is_ignored_rel(rel_of(p))
    }
    if actual != set(expected):
        missing = sorted(set(expected) - actual)
        extra = sorted(actual - set(expected))
        detail = ""
        if missing:
            detail += "; missing " + ", ".join(missing[:8])
        if extra:
            detail += "; unexpected " + ", ".join(extra[:8])
        raise ValueError("Bundle file inventory differs from checksums" + detail)
    for name, checksum in expected.items():
        path = bundle / name
        if Path(name).is_absolute() or ".." in Path(name).parts or not path.is_file():
            raise ValueError("Unsafe or missing bundle member: " + name)
        if path.is_symlink() or any(p.is_symlink() for p in path.parents if p != bundle.parent):
            raise ValueError("Bundle must not contain symlinks: " + name)
        if digest(path) != checksum:
            raise ValueError("Checksum mismatch: " + name)
    manifest = load(bundle / "manifest.json")
    if manifest.get("format") != 1:
        raise ValueError("Unsupported bundle format")
    payload = bundle / "payload/home"
    for path in payload.rglob("*"):
        if path.is_file():
            rel = path.relative_to(payload)
            if not any(rel == Path(root) or Path(root) in rel.parents for root in ROOTS):
                raise ValueError("Unexpected restore location: " + str(rel))
            if path.name in OMIT or omitted(path.name):
                raise ValueError("Excluded file leaked into payload: " + str(rel))
    print("Verified SHA-256 and payload paths:", len(expected), "files")
    return manifest


def export_setup(home, output, repo=False, force=False):
    """Snapshot per setup.

    `repo=True` additionally generates a git-ready directory: no archive,
    a `.gitignore`, and an `install.sh` that verifies and restores.
    `--force` allows refreshing an existing generated repo in place while
    preserving its `.git` history, but only when it looks like our output.
    """
    prerequisites()
    home = Path(home).expanduser().resolve()
    output = Path(output).expanduser().absolute()
    no_symlinks(output)
    output = output.resolve()
    archive = output.with_name(output.name + ".tar.gz")
    conflicts = [output]
    if not repo:
        conflicts.append(archive)
    if any(path.exists() for path in conflicts):
        if force and repo and output.is_dir():
            markers = [output / "migrate.py", output / "manifest.json", output / "payload"]
            if not all(marker.exists() for marker in markers):
                raise ValueError("Existing directory is not a generated repo; refusing --force: " + str(output))
        else:
            raise ValueError("Output or archive already exists; use --force to refresh a generated repo, "
                             "or a new directory: " + str(output))
    for root in ROOTS:
        source = home / root
        if output == source or source in output.parents:
            raise ValueError("Export output must be outside source directories")
    output.parent.mkdir(parents=True, exist_ok=True)
    agent = home / ".pi/agent"
    settings = load(agent / "settings.json")
    notes, packages, replacements = [], [], []
    # Keep the runtime beside cursor-essential, as its skills use sibling-relative paths.
    local_roots = []
    for entry in settings.get("packages", []):
        spec = entry if isinstance(entry, str) else entry["source"]
        item = {"source": spec}
        if spec.startswith("npm:"):
            name = spec[4:]
            if "@" in name[1:]:
                name = name.rsplit("@", 1)[0]
            pkg = load(agent / "npm/node_modules" / name / "package.json")
            pinned = "npm:" + name + "@" + pkg["version"]
            item.update(kind="npm", version=pkg["version"], restoredSource=pinned)
        else:
            if spec.startswith("git:github.com/"):
                gitpath = spec[4:].split("@", 1)[0]
                src = agent / "git" / gitpath
                target = "vendor/" + src.name
                item["commit"] = run(["git", "-C", str(src), "rev-parse", "HEAD"], capture=True).stdout.strip()
            elif spec.startswith(("git:", "http:", "https:")):
                raise ValueError("Unrecognized git checkout; map it explicitly: " + spec)
            else:
                src = Path(spec).expanduser()
                if not src.is_absolute():
                    src = agent / src
                src = src.resolve(strict=True)
                target = ("vendor/cursor-tool-capture/cursor-essential" if src.name == "cursor-essential"
                          else "vendor/" + src.name)
            local_roots.append((src, target))
            pinned = "./" + target
            item.update(kind="snapshot", restoredSource=pinned)
            replacements.append((str(src), TOKEN + "/.pi/agent/" + target))
        packages.append(item)
        if isinstance(entry, dict):
            entry["source"] = pinned
        else:
            settings["packages"][settings["packages"].index(entry)] = pinned
    runtime = home / "Personal/cursor-tool-capture/agent-essential-runtime"
    if runtime.exists():
        local_roots.append((runtime, "vendor/cursor-tool-capture/agent-essential-runtime"))
        replacements.append((str(runtime), TOKEN + "/.pi/agent/vendor/cursor-tool-capture/agent-essential-runtime"))
    # The source filesystem is case-insensitive; make both spellings portable to Linux.
    for src, dst in list(replacements):
        if "/Personal/" in src:
            replacements.append((src.replace("/Personal/", "/personal/"), dst))
        if "/personal/" in src:
            replacements.append((src.replace("/personal/", "/Personal/"), dst))
    global_modules = run(["npm", "root", "-g"], capture=True).stdout.strip()
    replacements.append((global_modules + "/@earendil-works/pi-coding-agent/node_modules",
                         TOKEN + "/.pi/agent/pi-runtime/node_modules"))
    replacements.append((global_modules, TOKEN + "/.pi/agent/pi-runtime/node_modules"))
    replacements.append((str(home), TOKEN))
    replacements.sort(key=lambda pair: len(pair[0]), reverse=True)
    for source, _ in local_roots:
        if output == source or source in output.parents:
            raise ValueError("Export output must be outside local package sources")
    secrets = secret_values(home)
    pi_version = run(["pi", "--version"], capture=True).stdout.strip()
    with tempfile.TemporaryDirectory(prefix=".pi-export-", dir=output.parent) as tmp:
        stage = Path(tmp) / "bundle"
        dest = stage / "payload/home/.pi/agent"
        dest.mkdir(parents=True)
        # Only small user configuration at the agent root, never sessions/cache/binaries.
        for path in sorted(agent.iterdir()):
            if path.is_file() and path.suffix in TEXT and not omitted(path.name):
                copy_resource(path, dest / path.name, replacements, secrets, notes)
        for name in ["extensions", "skills", "prompts", "themes"]:
            path = agent / name
            if path.exists():
                copy_resource(path, dest / name, replacements, secrets, notes)
        for root in ROOTS[1:]:
            if (home / root).exists():
                copy_resource(home / root, stage / "payload/home" / root, replacements, secrets, notes)
        for src, target in local_roots:
            copy_resource(src, dest / target, replacements, secrets, notes)
        patches = compatibility_patches(dest)
        for name in ["package.json", "package-lock.json"]:
            copy_resource(agent / "npm" / name, dest / "npm" / name, replacements, secrets, notes)
        settings.pop("deviceId", None)
        settings = sanitize_json(settings, notes, "settings.json")
        # Settings generally contain relative sources, but custom resource paths may be absolute.
        text = json.dumps(settings, ensure_ascii=False, indent=2)
        text = scrub(text, secrets, notes, "settings.json")
        for old, new in replacements:
            text = text.replace(old, new)
        (dest / "settings.json").write_text(text + "\n", encoding="utf-8")
        if (dest / "mcp.json").exists():
            mcp = load(dest / "mcp.json")
            for server in mcp.get("mcpServers", {}).values():
                if Path(server.get("command", "")).name == "node":
                    server["command"] = "node"
            save(dest / "mcp.json", mcp)
        core = dest / "pi-runtime"
        save(core / "package.json", {"name": "portable-pi-runtime", "private": True,
                                     "dependencies": {"@earendil-works/pi-coding-agent": pi_version}})
        # Generate a full transitive lock for Pi as well as retaining the plugin lock.
        run(["npm", "install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"], cwd=core)
        for name in ["migrate.py", "README.md"]:
            shutil.copy2(Path(__file__).resolve().parent / name, stage / name)
        manifest = {
            "format": 1, "createdAt": datetime.now(timezone.utc).isoformat(),
            "piVersion": pi_version, "nodeVersion": run(["node", "--version"], capture=True).stdout.strip(),
            "packages": packages, "redactions": [s.replace(str(stage), "bundle") for s in notes],
            "compatibilityPatches": patches,
            "excluded": ["credentials", "sessions", "trust decisions", "model catalogs", "node_modules",
                         "native binaries", "git history", "logs", "context-mode memory", "pi-lens caches"],
            "environmentNames": sorted(k for k in os.environ if SENSITIVE.search(k)),
            "runtimeBuilds": [".pi/agent/vendor/cursor-tool-capture/agent-essential-runtime"] if runtime.exists() else [],
        }
        save(stage / "manifest.json", manifest)
        # Include manifests and lock files in the final credential check as well.
        for path in stage.rglob("*"):
            if path.is_file():
                data = path.read_bytes()
                if any(secret.encode() in data for secret in secrets if len(secret) >= 12):
                    raise ValueError("Known credential remains in export: " + str(path.relative_to(stage)))
        if repo:
            (stage / ".gitignore").write_text(
                "# Ignore generated artifacts and machine-local state.\n"
                "*.tar.gz\n"
                "*.log\n"
                "restore-check/\n"
                "bundle/\n"
                "__pycache__/\n"
                ".DS_Store\n", encoding="utf-8")
            install = stage / "install.sh"
            install_lines = [
                "#!/bin/sh",
                "# One-command restore from a cloned git repository.",
                "set -eu",
                'SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)',
                'python3 "$SCRIPT_DIR/migrate.py" verify',
                'exec python3 "$SCRIPT_DIR/migrate.py" restore \\',
                '  --bundle "$SCRIPT_DIR" --allow-install-scripts "$@"',
            ]
            install.write_text("\n".join(install_lines) + "\n", encoding="utf-8")
            install.chmod(0o700)
        write_checksums(stage)
        verify(stage)
        if repo and force and (output / "manifest.json").exists():
            kept_git = Path(tmp) / "kept-git"
            old_repo = Path(tmp) / "old-repo"
            if (output / ".git").exists():
                shutil.move(str(output / ".git"), str(kept_git))
            shutil.move(str(output), str(old_repo))
            try:
                shutil.move(str(stage), str(output))
                if kept_git.exists():
                    shutil.move(str(kept_git), str(output / ".git"))
            except BaseException:
                if output.exists():
                    shutil.rmtree(output)
                shutil.move(str(old_repo), str(output))
                raise
            shutil.rmtree(old_repo)
        else:
            shutil.move(str(stage), str(output))
    output.chmod(0o700)
    if repo:
        print("Repository:", output)
        print("Packages:", len(packages), "Redactions:", len(notes))
        print("Next: cd", output, "&& git init && git add -A && git commit")
        return
    with tarfile.open(archive, "w:gz") as tar:
        tar.add(output, arcname=output.name)
    archive.chmod(0o600)
    print("Bundle:", output)
    print("Archive:", archive)
    print("Packages:", len(packages), "Redactions:", len(notes))


def no_symlinks(path):
    for parent in [path, *path.parents]:
        if parent.is_symlink():
            # macOS ships these system aliases; reject user-created links below them.
            system_alias = (sys.platform == "darwin" and str(parent) in {"/tmp", "/var", "/etc"}
                            and parent.resolve() == Path("/private" + str(parent)))
            if not system_alias:
                raise ValueError("Destination contains a symlink: " + str(parent))


def prerequisites():
    for command in ["node", "npm"]:
        if not shutil.which(command):
            raise ValueError("Required command not found: " + command)
    version = run(["node", "--version"], capture=True).stdout.strip().lstrip("v")
    if tuple(int(x) for x in version.split(".")[:3]) < (22, 19, 0):
        raise ValueError("Pi requires Node.js >= 22.19.0")


def restore(bundle, home, replace=False, skip_install=False, dry_run=False, allow_install_scripts=False):
    bundle, home = Path(bundle).resolve(), Path(home).expanduser().absolute()
    manifest = verify(bundle)
    no_symlinks(home)
    home = home.resolve()
    if home == Path("/") or TOKEN in str(home):
        raise ValueError("Unsafe target home")
    if not skip_install:
        prerequisites()
        if not dry_run and not allow_install_scripts:
            raise ValueError("Full restore executes package scripts and builds the bundled runtime; "
                             "review the bundle, then pass --allow-install-scripts")
    payload = bundle / "payload/home"
    roots = [home / root for root in ROOTS if (payload / root).exists()]
    launcher = home / ".local/bin/pi"
    for target in [*roots, launcher]:
        if target == bundle or target in bundle.parents or bundle in target.parents:
            raise ValueError("Restore destination overlaps the bundle")
        no_symlinks(target.parent)
        if target.is_symlink():
            raise ValueError("Refusing existing symlink: " + str(target))
    conflicts = [p for p in [*roots, launcher] if p.exists()]
    if conflicts and not replace:
        raise ValueError("Targets already exist; use --replace for timestamped backups: " + ", ".join(map(str, conflicts)))
    print("Target home:", home)
    print("Install dependencies:", not skip_install)
    for root in roots:
        print("Restore:", root)
    if dry_run:
        print("Dry run: no files changed and no install commands executed")
        return
    backup = home / ".pi/migration-backups" / datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    no_symlinks(backup)
    moved, installed = [], []
    try:
        for target in conflicts:
            saved = backup / target.relative_to(home)
            saved.parent.mkdir(parents=True, exist_ok=True)
            backup.chmod(0o700)
            shutil.move(str(target), str(saved))
            moved.append((saved, target))
        for target in roots:
            target.parent.mkdir(parents=True, exist_ok=True)
            installed.append(target)
            shutil.copytree(payload / target.relative_to(home), target)
            for path in target.rglob("*"):
                if path.is_file():
                    try:
                        text = path.read_text(encoding="utf-8")
                    except UnicodeError:
                        continue
                    if TOKEN in text:
                        # JSON needs escaping if the destination contains quotes/backslashes.
                        replacement = json.dumps(str(home), ensure_ascii=False)[1:-1] if path.suffix == ".json" else str(home)
                        path.write_text(text.replace(TOKEN, replacement), encoding="utf-8")
        agent = home / ".pi/agent"
        if not skip_install:
            # Pi needs no lifecycle scripts. Plugins/runtime may build native dependencies.
            run(["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"], cwd=agent / "pi-runtime")
            # Pi's managed lock excludes host-provided peers; preserve that policy.
            run(["npm", "ci", "--legacy-peer-deps", "--no-audit", "--no-fund"], cwd=agent / "npm")
            for relative in manifest["runtimeBuilds"]:
                if relative != ".pi/agent/vendor/cursor-tool-capture/agent-essential-runtime":
                    raise ValueError("Unexpected runtime build path")
                directory = home / relative
                run(["npm", "ci", "--include=dev", "--no-audit", "--no-fund"], cwd=directory)
                run(["npm", "run", "build"], cwd=directory)
            launcher.parent.mkdir(parents=True, exist_ok=True)
            entry = agent / "pi-runtime/node_modules/@earendil-works/pi-coding-agent/dist/cli.js"
            installed.append(launcher)
            launcher.write_text("#!/bin/sh\nexec node " + shlex.quote(str(entry)) + ' "$@"\n', encoding="utf-8")
            launcher.chmod(0o700)
            run([str(launcher), "--version"])
        print("Restored. Add ~/.local/bin to PATH, then open Pi and /login again.")
        if moved:
            print("Previous configuration backup:", backup)
    except BaseException:
        for target in reversed(installed):
            if target.is_dir():
                shutil.rmtree(target)
            elif target.exists():
                target.unlink()
        for saved, target in reversed(moved):
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(saved), str(target))
        raise


def doctor(home):
    prerequisites()
    home = Path(home).absolute()
    settings = load(home / ".pi/agent/settings.json")
    errors = []
    for entry in settings.get("packages", []):
        spec = entry if isinstance(entry, str) else entry["source"]
        if spec.startswith("npm:"):
            name = spec[4:].rsplit("@", 1)[0]
            path = home / ".pi/agent/npm/node_modules" / name / "package.json"
        else:
            path = home / ".pi/agent" / spec
        if not path.exists():
            errors.append("Missing package: " + spec)
    for relative in [".pi/agent/pi-runtime/node_modules/@earendil-works/pi-coding-agent/dist/cli.js",
                     ".pi/agent/vendor/cursor-tool-capture/agent-essential-runtime/dist/src/surfaces/cli/main.js"]:
        if not (home / relative).is_file():
            errors.append("Missing executable: " + relative)
    for command in ["tmux", "rg"]:
        print(command + ":", shutil.which(command) or "not found (install for worker/search features)")
    if errors:
        raise ValueError("\n".join(errors))
    launcher = home / ".local/bin/pi"
    if not launcher.is_file() or not os.access(launcher, os.X_OK):
        raise ValueError("Pi launcher is missing or not executable: " + str(launcher))
    version = run([str(launcher), "--version"], capture=True).stdout.strip()
    print("Pi version:", version)
    print("All configured package paths and runtime entry points exist.")
    print("Credentials, provider requests, LSP servers and interactive UI still need a live smoke test.")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    exp = sub.add_parser("export", help="Snapshot the current setup; requires npm registry access")
    exp.add_argument("--home", type=Path, default=Path.home())
    exp.add_argument("--output", type=Path, required=True)
    exp.add_argument("--repo", action="store_true",
                     help="Generate a git-ready directory instead of an archive")
    exp.add_argument("--force", action="store_true",
                     help="Refresh an existing generated repo in place, preserving its .git history")
    for name in ["verify", "restore"]:
        p = sub.add_parser(name)
        p.add_argument("--bundle", type=Path, default=Path(__file__).resolve().parent)
        if name == "restore":
            p.add_argument("--home", type=Path, default=Path.home())
            p.add_argument("--replace", action="store_true")
            p.add_argument("--skip-install", action="store_true")
            p.add_argument("--dry-run", action="store_true")
            p.add_argument("--allow-install-scripts", action="store_true",
                           help="Explicitly trust plugin lifecycle scripts and the bundled runtime build")
    p = sub.add_parser("doctor")
    p.add_argument("--home", type=Path, default=Path.home())
    args = parser.parse_args(argv)
    if args.command == "export":
        export_setup(args.home, args.output, args.repo, args.force)
    elif args.command == "verify":
        verify(args.bundle)
    elif args.command == "restore":
        restore(args.bundle, args.home, args.replace, args.skip_install, args.dry_run, args.allow_install_scripts)
    else:
        doctor(args.home)


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, subprocess.CalledProcessError) as exc:
        print("ERROR:", exc, file=sys.stderr)
        sys.exit(1)
