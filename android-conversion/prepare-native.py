from pathlib import Path
import shutil
import re

root = Path(__file__).resolve().parent
project = root / 'android'
main = project / 'app/src/main'
shutil.copytree(root / 'native/java', main / 'java', dirs_exist_ok=True)
shutil.copytree(root / 'native/cpp', main / 'cpp', dirs_exist_ok=True)
shutil.rmtree(project / 'app/src/androidTest/java', ignore_errors=True)
shutil.copytree(root / 'native/androidTest', project / 'app/src/androidTest/java', dirs_exist_ok=True)
firebase_config = root / 'firebase/google-services.json'
if firebase_config.is_file():
    shutil.copyfile(firebase_config, project / 'app/google-services.json')
key = root / '.keys/zeroapply-android.jks'
if key.is_file():
    shutil.copyfile(key, project / 'app/zeroapply-debug.keystore')
gradle = project / 'app/build.gradle'
text = gradle.read_text().replace('applicationId "com.zeroapply.app.android"', 'applicationId "com.zeroapply.app.android.ai"')
if 'ndkVersion' not in text:
    text = text.replace('android {', '\n'.join(['android {', '    ndkVersion "28.2.13676358"', '    externalNativeBuild { cmake { path "src/main/cpp/CMakeLists.txt"; version "3.22.1" } }']), 1)
if 'buildToolsVersion' not in text:
    text = text.replace('android {', 'android {\n    buildToolsVersion "36.0.0"', 1)
if 'abiFilters' not in text:
    text = text.replace('defaultConfig {', '\n'.join(['defaultConfig {', "        ndk { abiFilters 'arm64-v8a', 'x86_64' }", '        externalNativeBuild { cmake { arguments "-DANDROID_STL=c++_shared" } }']), 1)
if 'noCompress' not in text:
    text = text.replace('aaptOptions {', "aaptOptions {\n            noCompress 'gguf'", 1)
if 'androidx.credentials:credentials:' not in text:
    text = text.replace('dependencies {', "dependencies {\n    implementation 'androidx.credentials:credentials:1.5.0'\n    implementation 'androidx.credentials:credentials-play-services-auth:1.5.0'\n    implementation 'com.google.android.libraries.identity.googleid:googleid:1.1.1'", 1)
if 'zeroapply-debug.keystore' not in text and (project / 'app/zeroapply-debug.keystore').is_file():
    text = text.replace('buildTypes {', "signingConfigs {\n        debug { storeFile file('zeroapply-debug.keystore'); storePassword 'android'; keyAlias 'androiddebugkey'; keyPassword 'android' }\n    }\n    buildTypes {", 1)
text = re.sub(r"versionCode \d+", "versionCode 3", text)
text = re.sub(r'versionName "[^\"]+"', 'versionName "1.0.2"', text)
gradle.write_text(text)
manifest = main / 'AndroidManifest.xml'
text = manifest.read_text().replace('android:allowBackup="true"', 'android:allowBackup="false"').replace('android:name=".MainActivity"', 'android:name="com.zeroapply.app.android.MainActivity"')
if 'android:usesCleartextTraffic=' not in text:
    text = text.replace('<application', '<application android:usesCleartextTraffic="true"', 1)
text = text.replace('android:usesCleartextTraffic="false"', 'android:usesCleartextTraffic="true"')
manifest.write_text(text)
for folder in (main / 'res').glob('mipmap-*'):
    if folder.is_dir() and 'anydpi' not in folder.name:
        for name in ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']:
            shutil.copyfile(root.parent / 'public/logo_square.png', folder / name)
print('Native AI integration prepared; AI edition uses a separate install identity.')
