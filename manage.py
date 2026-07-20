#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import subprocess
import sys
from pathlib import Path


def _rerun_with_project_python():
    """Use the bundled virtual environment even when `python manage.py` is used."""
    if os.name != "nt" or os.environ.get("BLOOD_ANALYZER_VENV_ACTIVE") == "1":
        return

    project_python = Path(__file__).resolve().parent / "venv" / "Scripts" / "python.exe"
    if not project_python.exists():
        return
    if Path(sys.executable).resolve() == project_python.resolve():
        return

    env = os.environ.copy()
    env["BLOOD_ANALYZER_VENV_ACTIVE"] = "1"
    command = [str(project_python), str(Path(__file__).resolve()), *sys.argv[1:]]
    raise SystemExit(subprocess.call(command, env=env))


def main():
    _rerun_with_project_python()
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
