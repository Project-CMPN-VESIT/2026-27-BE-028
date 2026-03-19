#!/usr/bin/env python3
"""
System validation script to verify all components are correctly configured.
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def check_imports():
    """Verify all required modules can be imported"""
    print("🔍 Checking imports...")

    modules = [
        ('fastapi', 'FastAPI'),
        ('uvicorn', 'Uvicorn'),
        ('pandas', 'Pandas'),
        ('numpy', 'NumPy'),
        ('skyfield', 'Skyfield'),
        ('pydantic', 'Pydantic'),
    ]

    for module, name in modules:
        try:
            __import__(module)
            print(f"  ✅ {name}")
        except ImportError as e:
            print(f"  ❌ {name}: {e}")
            return False

    return True

def check_data():
    """Verify dataset exists"""
    print("\n📊 Checking dataset...")

    dataset_path = os.path.join(os.path.dirname(__file__), 'backend', 'data', 'satellite_conjunction_dataset.csv')

    if os.path.exists(dataset_path):
        size_mb = os.path.getsize(dataset_path) / (1024 * 1024)
        print(f"  ✅ Dataset found ({size_mb:.1f} MB)")

        # Try to read first few rows
        try:
            import pandas as pd
            df = pd.read_csv(dataset_path, nrows=5)
            print(f"  ✅ Dataset readable ({len(df.columns)} columns)")
            print(f"     Columns: {', '.join(df.columns[:5])}...")
            return True
        except Exception as e:
            print(f"  ❌ Error reading dataset: {e}")
            return False
    else:
        print(f"  ❌ Dataset not found at {dataset_path}")
        return False

def check_services():
    """Verify backend services can be instantiated"""
    print("\n🔧 Checking backend services...")

    try:
        # Change to backend directory
        os.chdir(os.path.join(os.path.dirname(__file__), 'backend'))

        from app.services.data_processor import get_data_processor
        print("  ✅ Data processor")

        from app.services.simulation import get_orbital_simulator
        print("  ✅ Orbital simulator")

        from app.services.cost_model import get_cost_model
        print("  ✅ Cost model")

        from app.services.uncertainty_model import get_uncertainty_model
        print("  ✅ Uncertainty model")

        from app.services.safety_checks import get_safety_checker
        print("  ✅ Safety checker")

        from app.services.causal_engine import get_causal_engine
        print("  ✅ Causal engine")

        from app.services.decision_engine import get_decision_engine
        print("  ✅ Decision engine")

        return True
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def check_frontend():
    """Verify frontend files exist"""
    print("\n🎨 Checking frontend...")

    files = [
        ('frontend/index.html', 'HTML'),
        ('frontend/app.js', 'React app'),
    ]

    all_good = True
    for filepath, name in files:
        full_path = os.path.join(os.path.dirname(__file__), filepath)
        if os.path.exists(full_path):
            size_kb = os.path.getsize(full_path) / 1024
            print(f"  ✅ {name} ({size_kb:.1f} KB)")
        else:
            print(f"  ❌ {name} not found")
            all_good = False

    return all_good

def main():
    """Run all validation checks"""
    print("=" * 70)
    print("System Validation Check")
    print("=" * 70)

    checks = [
        ("Dependencies", check_imports),
        ("Dataset", check_data),
        ("Backend Services", check_services),
        ("Frontend", check_frontend),
    ]

    results = []
    for name, check_func in checks:
        try:
            result = check_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n  ❌ Unexpect error in {name}: {e}")
            results.append((name, False))

    # Summary
    print("\n" + "=" * 70)
    print("Summary:")
    print("=" * 70)

    all_passed = True
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
        all_passed = all_passed and result

    print("=" * 70)

    if all_passed:
        print("\n🎉 All checks passed! System is ready to run.")
        print("\nTo start the system:")
        print("  cd backend")
        print("  python -m uvicorn app.main:app --reload")
        print("\nThen open: http://localhost:8000")
    else:
        print("\n⚠️  Some checks failed. Please review the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
