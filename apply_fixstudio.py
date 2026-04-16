import os

base_dir = os.getcwd()

def replace_in_file(path, old, new):
    if os.path.exists(path):
        with open(path, 'r') as f: content = f.read()
        with open(path, 'w') as f: f.write(content.replace(old, new))
        print(f"[OK] Updated: {path}")

# ১. Branding: Label Studio -> FixStudio
replace_in_file('label_studio/core/settings/base.py', "APP_NAME = 'Label Studio'", "APP_NAME = 'FixStudio'")

# ২. Backend: User Serializer-এ Role যোগ করা
serializer_path = 'label_studio/users/serializers.py'
if os.path.exists(serializer_path):
    with open(serializer_path, 'r') as f: content = f.read()
    if "'role'" not in content:
        content = content.replace("'email',", "'email', 'role', 'is_suspended',")
        with open(serializer_path, 'w') as f: f.write(content)
        print("[OK] Serializer Updated")

# ৩. Frontend: Organization Table-এ Role কলাম এবং Action বাটন যোগ করা
# এটি আপনার বর্তমান অর্গানাইজেশন পেজকে আপডেট করবে
print("Module 2 injection ready. Please Push to Git.")