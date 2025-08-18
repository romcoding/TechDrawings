#!/usr/bin/env python3
"""
Simple test script for Technical Drawing Analyzer
"""

import os
import sys

def test_imports():
    """Test if all required modules can be imported"""
    print("🧪 Testing imports...")
    
    try:
        from config import Config
        print("✅ Config module imported successfully")
    except ImportError as e:
        print(f"❌ Config import failed: {e}")
        return False
    
    try:
        from detection import openai_detect_components
        print("✅ Detection module imported successfully")
    except ImportError as e:
        print(f"❌ Detection import failed: {e}")
        return False
    
    try:
        from app import app
        print("✅ Flask app imported successfully")
    except ImportError as e:
        print(f"❌ Flask app import failed: {e}")
        return False
    
    return True

def test_configuration():
    """Test configuration loading"""
    print("\n🔧 Testing configuration...")
    
    try:
        from config import Config
        
        # Test configuration values
        print(f"   OpenAI Model: {Config.OPENAI_MODEL}")
        print(f"   Upload Folder: {Config.UPLOAD_FOLDER}")
        print(f"   Max File Size: {Config.MAX_CONTENT_LENGTH / (1024*1024):.1f} MB")
        print(f"   Technical Standards: {len(Config.TECHNICAL_STANDARDS)} standards")
        print(f"   Component Categories: {len(Config.COMPONENT_CATEGORIES)} categories")
        
        print("✅ Configuration loaded successfully")
        return True
    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
        return False

def test_file_structure():
    """Test if required files and directories exist"""
    print("\n📁 Testing file structure...")
    
    required_files = [
        'app.py',
        'detection.py',
        'config.py',
        'requirements.txt',
        'package.json',
        'README.md'
    ]
    
    required_dirs = [
        'src',
        'src/components',
        '.github/workflows'
    ]
    
    all_good = True
    
    for file in required_files:
        if os.path.exists(file):
            print(f"✅ {file} exists")
        else:
            print(f"❌ {file} missing")
            all_good = False
    
    for dir_path in required_dirs:
        if os.path.exists(dir_path):
            print(f"✅ {dir_path}/ exists")
        else:
            print(f"❌ {dir_path}/ missing")
            all_good = False
    
    # Check if dist folder exists (frontend build)
    if os.path.exists('dist'):
        print("✅ dist/ folder exists (frontend built)")
    else:
        print("⚠️  dist/ folder missing (run 'npm run build' first)")
    
    return all_good

def test_environment():
    """Test environment setup"""
    print("\n🌍 Testing environment...")
    
    # Check Python version
    python_version = sys.version_info
    print(f"   Python: {python_version.major}.{python_version.minor}.{python_version.micro}")
    
    if python_version.major == 3 and python_version.minor >= 8:
        print("✅ Python version is compatible")
    else:
        print("❌ Python 3.8+ required")
        return False
    
    # Check if virtual environment is active
    if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("✅ Virtual environment is active")
    else:
        print("⚠️  Virtual environment not detected")
    
    # Check if .env file exists
    if os.path.exists('.env'):
        print("✅ .env file exists")
    else:
        print("⚠️  .env file missing (copy from env.example)")
    
    return True

def main():
    """Run all tests"""
    print("🚀 Technical Drawing Analyzer - Test Suite")
    print("=" * 50)
    
    tests = [
        test_imports,
        test_configuration,
        test_file_structure,
        test_environment
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {e}")
            results.append(False)
    
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    
    passed = sum(results)
    total = len(results)
    
    for i, (test, result) in enumerate(zip(tests, results), 1):
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {i}. {test.__name__}: {status}")
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Your application is ready to run.")
        print("\n🚀 To start the application:")
        print("   source venv/bin/activate")
        print("   python app.py")
        print("   Then open: http://localhost:10000")
    else:
        print("⚠️  Some tests failed. Please check the issues above.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
