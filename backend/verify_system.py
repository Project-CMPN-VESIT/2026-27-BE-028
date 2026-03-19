"""
System Verification Script

Run this to verify that the system is properly set up and ready to use.
"""

import sys
import os
from pathlib import Path


def check_python_version():
    """Check Python version."""
    version = sys.version_info
    if version.major >= 3 and version.minor >= 9:
        print("✅ Python version OK:", sys.version.split()[0])
        return True
    else:
        print(f"❌ Python version {version.major}.{version.minor} too old. Need 3.9+")
        return False


def check_directory_structure():
    """Check that all required directories exist."""
    required_dirs = [
        "backend/app/routes",
        "backend/app/services",
        "backend/app/models",
        "backend/app/utils",
        "backend/data",
        "frontend"
    ]

    all_exist = True
    for dir_path in required_dirs:
        if Path(dir_path).exists():
            print(f"✅ {dir_path}")
        else:
            print(f"❌ Missing: {dir_path}")
            all_exist = False

    return all_exist


def check_required_files():
    """Check that all required files exist."""
    required_files = [
        "backend/app/main.py",
        "backend/app/routes/decision.py",
        "backend/app/services/decision_engine.py",
        "backend/app/services/simulation.py",
        "backend/app/services/cost_model.py",
        "backend/app/services/uncertainty_model.py",
        "backend/app/services/safety_checks.py",
        "backend/app/services/causal_engine.py",
        "backend/app/services/data_processor.py",
        "backend/app/models/schema.py",
        "backend/app/utils/constants.py",
        "backend/requirements.txt",
        "backend/main.py",
        "frontend/index.html",
        "frontend/script.js",
        "frontend/style.css",
        "README.md",
        "QUICKSTART.md"
    ]

    all_exist = True
    for file_path in required_files:
        if Path(file_path).exists():
            print(f"✅ {file_path}")
        else:
            print(f"❌ Missing: {file_path}")
            all_exist = False

    return all_exist


def check_dataset():
    """Check that dataset exists."""
    dataset_path = Path("backend/data/satellite_conjunction_dataset.csv")
    if dataset_path.exists():
        # Try to read it
        try:
            with open(dataset_path, 'r') as f:
                lines = f.readlines()
                print(f"✅ Dataset found: {len(lines) - 1} rows")
                return True
        except Exception as e:
            print(f"❌ Dataset file exists but cannot be read: {e}")
            return False
    else:
        print("❌ Dataset not found at:", dataset_path)
        return False


def check_dependencies():
    """Check that required Python packages are installed."""
    required_packages = [
        "fastapi",
        "uvicorn",
        "pydantic",
        "pandas",
        "numpy"
    ]

    all_installed = True
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package} installed")
        except ImportError:
            print(f"❌ {package} NOT installed")
            all_installed = False

    if not all_installed:
        print("\n💡 Install missing packages with:")
        print("   cd backend")
        print("   pip install -r requirements.txt")

    return all_installed


def main():
    """Run all checks."""
    print("=" * 80)
    print("🔍 SYSTEM VERIFICATION")
    print("=" * 80)

    checks = [
        ("Python Version", check_python_version),
        ("Directory Structure", check_directory_structure),
        ("Required Files", check_required_files),
        ("Dataset", check_dataset),
        ("Dependencies", check_dependencies)
    ]

    results = []
    for name, check_func in checks:
        print(f"\n📋 Checking {name}...")
        print("-" * 80)
        result = check_func()
        results.append((name, result))

    # Summary
    print("\n" + "=" * 80)
    print("📊 VERIFICATION SUMMARY")
    print("=" * 80)

    all_passed = True
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
        if not result:
            all_passed = False

    print("\n" + "=" * 80)

    if all_passed:
        print("🎉 SUCCESS! System is ready to run.")
        print("\n📝 Next steps:")
        print("   1. cd backend")
        print("   2. python main.py")
        print("   3. Open http://localhost:8000 in your browser")
        print("\n📚 See QUICKSTART.md for detailed instructions")
    else:
        print("⚠️  Some checks failed. Please fix the issues above.")
        print("\n💡 Common solutions:")
        print("   - Install dependencies: pip install -r backend/requirements.txt")
        print("   - Verify dataset is in backend/data/")
        print("   - Check Python version: python --version")

    print("=" * 80)


if __name__ == "__main__":
    # Change to project root directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)

    main()
